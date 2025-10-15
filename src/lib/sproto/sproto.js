var sproto = (function() {
    var t = {};

    var SIZEOF_LENGTH = 4;
    var SIZEOF_HEADER = 2;
    var SIZEOF_FIELD = 2;

    var SPROTO_TINTEGER = 0;
    var SPROTO_TBOOLEAN = 1;
    var SPROTO_TSTRING = 2;
    var SPROTO_TSTRUCT = 3;
    var SPROTO_TDOUBLE = 4;

    var SPROTO_TARRAY = 0x80;

    var SPROTO_REQUEST = 0;
    var SPROTO_RESPONSE = 1;

    var ENCODE_BUFFERSIZE = 2050;
    var ENCODE_MAXSIZE = 0x1000000;
    var ENCODE_DEEPLEVEL = 64;

    var SPROTO_CB_ERROR = -1;
    var SPROTO_CB_NIL = 0;
    var SPROTO_CB_NOARRAY = 1;

    function toword(buffer) {
        return buffer[0] + buffer[1] * 256;
    }

    function todword(buffer) {
        return buffer[0] + buffer[1] * 256 + buffer[2] * 65536 + buffer[3] * 16777216;
    }

    function expand64(v) {
        if (v & 0x80000000) {
            return v - 0x100000000;
        } else {
            return v;
        }
    }

    function hi_low_uint64(low, hi) {
        if (hi & 0x80000000) {
            hi = hi - 0x100000000;
        }
        return hi * 0x100000000 + low;
    }

    function double_to_binary(num) {
        var buffer = new ArrayBuffer(8);
        var view = new DataView(buffer);
        view.setFloat64(0, num, true);
        var result = [];
        for (var i = 0; i < 8; i++) {
            result.push(view.getUint8(i));
        }
        return result;
    }

    function binary_to_double(binary) {
        var buffer = new ArrayBuffer(8);
        var view = new DataView(buffer);
        for (var i = 0; i < 8; i++) {
            view.setUint8(i, binary[i]);
        }
        return view.getFloat64(0, true);
    }

    function writeword(n, buffer, idx) {
        buffer[idx] = n & 0xff;
        buffer[idx + 1] = (n >> 8) & 0xff;
    }

    function writedword(n, buffer, idx) {
        buffer[idx] = n & 0xff;
        buffer[idx + 1] = (n >> 8) & 0xff;
        buffer[idx + 2] = (n >> 16) & 0xff;
        buffer[idx + 3] = (n >> 24) & 0xff;
    }

    var netutils = (function() {
        var t = {};

        t.array2arraybuffer = function(array) {
            var b = new ArrayBuffer(array.length);
            var v = new DataView(b, 0);
            for (var i = 0; i < array.length; i++) {
                v.setUint8(i, array[i]);
            }
            return b;
        }

        t.arraybuffer2array = function(buffer) {
            var v = new DataView(buffer, 0);
            var a = new Array();
            for (var i = 0; i < v.byteLength; i++) {
                a[i] = v.getUint8(i);
            }
            return a;
        }

        t.string2utf8 = function(str) {
            var back = [];
            var byteSize = 0;

            for (var i = 0; i < str.length; i++) {
                var code = str.charCodeAt(i);
                if (0x00 <= code && code <= 0x7f) {
                    byteSize += 1;
                    back.push(code);
                } else if (0x80 <= code && code <= 0x7ff) {
                    byteSize += 2;
                    back.push((192 | (31 & (code >> 6))));
                    back.push((128 | (63 & code)))
                } else if ((0x800 <= code && code <= 0xd7ff) || (0xe000 <= code && code <= 0xffff)) {
                    byteSize += 3;
                    back.push((224 | (15 & (code >> 12))));
                    back.push((128 | (63 & (code >> 6))));
                    back.push((128 | (63 & code)))
                }
            }

            for (i = 0; i < back.length; i++) {
                back[i] &= 0xff;
            }

            return back;
        };

        t.utf82string = function(arr) {
            if (typeof arr === 'string') {
                return null;
            }

            var UTF = '';
            for (var i = 0; i < arr.length; i++) {
                if (arr[i] == null) {
                    break;
                }

                var one = arr[i].toString(2);
                var v = one.match(/^1+?(?=0)/);
                if (v && one.length == 8) {
                    var bytesLength = v[0].length;
                    var store = arr[i].toString(2).slice(7 - bytesLength);

                    for (var st = 1; st < bytesLength; st++) {
                        store += arr[st + i].toString(2).slice(2);
                    }
                    UTF += String.fromCharCode(parseInt(store, 2));
                    i += bytesLength - 1;
                } else {
                    UTF += String.fromCharCode(arr[i]);
                }
            }
            return UTF;
        };

        t.arrayconcat = function(a1, a2) {
            var b = new Array();

            for (var i = 0; i < a1.length; i++) {
                b[i] = a1[i];
            }

            for (var j = a1.length; j < a1.length + a2.length; j++) {
                b[j] = a2[j - a1.length];
            }

            return b;
        };

        return t;
    }());

    function sproto_create(buffer) {
        var sp = {};
        sp.tcache = new Map();
        sp.pcache = new Map();

        function sproto_dump(sp) {
            console.log("=== SPROTO DUMP ===");
            console.log("Types:", sp.type);
            console.log("Protocols:", sp.protocol);
        }

        function sproto_type(sp, typename) {
            if (sp.type[typename]) {
                return sp.type[typename];
            }
            return null;
        }

        function sproto_prototag(sp, name) {
            for (var tag in sp.protocol) {
                if (sp.protocol[tag].name === name) {
                    return parseInt(tag);
                }
            }
            return -1;
        }

        function sproto_protoname(sp, tag) {
            if (sp.protocol[tag]) {
                return sp.protocol[tag].name;
            }
            return null;
        }

        function sproto_protoquery(sp, tag, what) {
            if (sp.protocol[tag]) {
                if (what === SPROTO_REQUEST) {
                    return sp.protocol[tag].request;
                } else if (what === SPROTO_RESPONSE) {
                    return sp.protocol[tag].response;
                }
            }
            return null;
        }

        function findtag(st, tag) {
            for (var i = 0; i < st.length; i++) {
                if (st[i].tag === tag) {
                    return st[i];
                }
            }
            return null;
        }

        function sproto_encode(st, buffer, buffer_idx, cb, ud) {
            var header_tmp = {
                type: null,
                session: null
            };

            var field = new Array();
            var data = new Array();
            var index = 0;
            var fn = 0;

            for (var i = 0; i < st.length; i++) {
                var f = st[i];
                var args = {
                    tagname: f.name,
                    tagid: f.tag,
                    type: f.type & ~SPROTO_TARRAY,
                    index: 0,
                    mainindex: f.key,
                    extra: f.extra,
                    subtype: f.st ? ud.st.type[f.st] : null,
                    buffer: data,
                    buffer_idx: data.length,
                    length: 0
                };

                if (f.type & SPROTO_TARRAY) {
                    args.index = -1;
                }

                var r = cb(args);
                if (r === SPROTO_CB_NIL) {
                    continue;
                } else if (r === SPROTO_CB_NOARRAY) {
                    args.index = 0;
                    r = cb(args);
                    if (r === SPROTO_CB_NIL) {
                        continue;
                    }
                }

                if (r < 0) {
                    return r;
                }

                if (index !== f.tag) {
                    var skip = f.tag - index;
                    index = f.tag;
                    writeword((skip << 1) | 1, field, fn * SIZEOF_FIELD);
                    fn++;
                }

                if (r === 0) {
                    writeword(f.tag << 1, field, fn * SIZEOF_FIELD);
                } else {
                    writeword(((data.length - r) << 1) | 0, field, fn * SIZEOF_FIELD);
                    writedword(r, data, data.length - r - SIZEOF_LENGTH);
                }
                fn++;
                index++;
            }

            writeword(fn, buffer, buffer_idx);
            for (var j = 0; j < field.length; j++) {
                buffer[buffer_idx + SIZEOF_HEADER + j] = field[j];
            }
            for (var k = 0; k < data.length; k++) {
                buffer[buffer_idx + SIZEOF_HEADER + field.length + k] = data[k];
            }

            return SIZEOF_HEADER + field.length + data.length;
        }

        function encode_array(cb, args, array) {
            if (!Array.isArray(array)) {
                return SPROTO_CB_NIL;
            }

            args.index = 0;
            for (var i = 0; i < array.length; i++) {
                args.index = i + 1;
                var r = cb(args);
                if (r < 0) {
                    return r;
                }
            }
            return 0;
        }

        function encode(args) {
            var self = args.ud;
            var target = null;

            if (self.deep >= ENCODE_DEEPLEVEL) {
                alert("the table is too deep");
                return SPROTO_CB_ERROR;
            }

            if (args.index < 0) {
                if (self.indata[args.tagname] === undefined) {
                    return SPROTO_CB_NIL;
                }
                return encode_array(encode, args, self.indata[args.tagname]);
            }

            if (args.index > 0) {
                target = self.indata[args.tagname][args.index - 1];
            } else {
                target = self.indata[args.tagname];
            }

            if (target === undefined || target === null) {
                return SPROTO_CB_NIL;
            }

            switch (args.type) {
                case SPROTO_TINTEGER:
                    {
                        var n = target;
                        if (args.extra) {
                            n = Math.floor(n * args.extra);
                        }
                        if (n >= 0 && n < 0x8000) {
                            return n;
                        }
                        writedword(8, args.buffer, args.buffer_idx);
                        if (n < 0) {
                            writedword(n, args.buffer, args.buffer_idx + SIZEOF_LENGTH);
                            writedword(0xffffffff, args.buffer, args.buffer_idx + SIZEOF_LENGTH + 4);
                        } else {
                            writedword(n, args.buffer, args.buffer_idx + SIZEOF_LENGTH);
                            writedword(0, args.buffer, args.buffer_idx + SIZEOF_LENGTH + 4);
                        }
                        return 8 + SIZEOF_LENGTH;
                    }
                case SPROTO_TDOUBLE:
                    {
                        var doubleBin = double_to_binary(target);
                        writedword(8, args.buffer, args.buffer_idx);
                        for (var i = 0; i < 8; i++) {
                            args.buffer[args.buffer_idx + SIZEOF_LENGTH + i] = doubleBin[i];
                        }
                        return 8 + SIZEOF_LENGTH;
                    }
                case SPROTO_TBOOLEAN:
                    {
                        return target ? 1 : 0;
                    }
                case SPROTO_TSTRING:
                    {
                        var arr;
                        if (args.extra) {
                            arr = target;
                        } else {
                            arr = netutils.string2utf8(target);
                        }
                        var sz = arr.length;
                        writedword(sz, args.buffer, args.buffer_idx);
                        if (args.length < sz) {
                            args.length = sz;
                        }
                        for (var i = 0; i < arr.length; i++) {
                            args.buffer[args.buffer_idx + SIZEOF_LENGTH + i] = arr[i];
                        }
                        return sz + SIZEOF_LENGTH;
                    }
                case SPROTO_TSTRUCT:
                    {
                        var sub = {};
                        sub.st = args.subtype;
                        sub.deep = self.deep + 1;
                        sub.indata = target;
                        var r = sproto_encode(args.subtype, args.buffer, args.buffer_idx, encode, sub);
                        if (r < 0) {
                            return SPROTO_CB_ERROR;
                        }
                        return r;
                    }
                default:
                    alert("Invalid filed type " + args.type);
                    return SPROTO_CB_ERROR;
            }
        }

        function sproto_decode(st, data, size, cb, ud) {
            var args = {};
            var total = size;
            var stream, datastream, fn, tag;
            if (size < SIZEOF_HEADER) return -1;
            stream = data.slice(0);
            fn = toword(stream);
            stream = stream.slice(SIZEOF_HEADER);
            size -= SIZEOF_HEADER;
            if (size < fn * SIZEOF_FIELD)
                return -1;
            datastream = stream.slice(fn * SIZEOF_FIELD);
            size -= fn * SIZEOF_FIELD;
            args.ud = ud;

            tag = -1;
            for (var i = 0; i < fn; i++) {
                var currentdata = null;
                var f = null;
                var value = toword(stream.slice(i * SIZEOF_FIELD));
                ++tag;
                if (value & 1 != 0) {
                    tag += Math.floor(value / 2);
                    continue;
                }
                value = Math.floor(value / 2) - 1;
                currentdata = datastream.slice(0);
                if (value < 0) {
                    var sz;
                    if (size < SIZEOF_LENGTH) {
                        return -1;
                    }
                    sz = todword(datastream);
                    if (size < sz + SIZEOF_LENGTH) {
                        return -1;
                    }
                    datastream = datastream.slice(sz + SIZEOF_LENGTH);
                    size -= sz + SIZEOF_LENGTH;
                }
                f = findtag(st, tag);
                if (f == null) {
                    continue;
                }
                args.tagname = f.name;
                args.tagid = f.tag;
                args.type = f.type & ~SPROTO_TARRAY;
                if (f.st != null) {
                    args.subtype = sp.type[f.st];
                } else {
                    args.subtype = null;
                }

                args.index = 0;
                args.mainindex = f.key;
                args.extra = f.extra;
                if (value < 0) {
                    if ((f.type & SPROTO_TARRAY) != 0) {
                        if (decode_array(cb, args, currentdata)) {
                            return -1;
                        }
                    } else {
                        switch (f.type) {
                            case SPROTO_TDOUBLE:
                                {
                                    var sz = todword(currentdata);
                                    if (sz == 8){
                                        let doubleBin = currentdata.slice(SIZEOF_LENGTH, SIZEOF_LENGTH+8);
                                        args.value = binary_to_double(doubleBin);
                                        args.length = 8;
                                        cb(args);
                                    } else {
                                        return -1;
                                    }
                                    break;
                                }
                            case SPROTO_TINTEGER:
                                {
                                    var sz = todword(currentdata);
                                    if (sz == 4) {
                                        var v = expand64(todword(currentdata.slice(SIZEOF_LENGTH)));
                                        args.value = v;
                                        args.length = 8;
                                        cb(args);
                                    } else if(sz == 8) {
                                        var low = todword(currentdata.slice(SIZEOF_LENGTH));
                                        var hi = todword(currentdata.slice(SIZEOF_LENGTH + 4));
                                        var v = hi_low_uint64(low, hi);
                                        args.value = v;
                                        args.length = 8;
                                        cb(args);
                                    } else {
                                        return -1;
                                    } 
                                    break;
                                }
                            case SPROTO_TSTRING:
                            case SPROTO_TSTRUCT:
                                {
                                    var sz = todword(currentdata);
                                    args.value = currentdata.slice(SIZEOF_LENGTH);
                                    args.length = sz;
                                    if (cb(args) != 0) {
                                        return -1;
                                    }
                                    break;
                                }
                            default:
                                return -1;
                        }
                    }
                } else if (f.type != SPROTO_TINTEGER && f.type != SPROTO_TBOOLEAN) {
                    return -1;
                } else {
                    args.value = value;
                    args.length = 8;
                    cb(args);
                }
            }
            return total - size;
        }

        function decode_array(cb, args, data) {
            var sz = todword(data);
            data = data.slice(SIZEOF_LENGTH);
            var index = 0;
            while (sz > 0) {
                args.index = ++index;
                var r;
                switch (args.type) {
                    case SPROTO_TINTEGER:
                        {
                            if (sz < 4) return -1;
                            var v = expand64(todword(data));
                            args.value = v;
                            args.length = 8;
                            cb(args);
                            data = data.slice(4);
                            sz -= 4;
                            break;
                        }
                    case SPROTO_TDOUBLE:
                        {
                            if (sz < 8) return -1;
                            args.value = binary_to_double(data.slice(0, 8));
                            args.length = 8;
                            cb(args);
                            data = data.slice(8);
                            sz -= 8;
                            break;
                        }
                    case SPROTO_TBOOLEAN:
                        {
                            if (sz < 1) return -1;
                            args.value = data[0];
                            args.length = 1;
                            cb(args);
                            data = data.slice(1);
                            sz -= 1;
                            break;
                        }
                    case SPROTO_TSTRING:
                        {
                            if (sz < SIZEOF_LENGTH) return -1;
                            var len = todword(data);
                            if (sz < len + SIZEOF_LENGTH) return -1;
                            args.value = data.slice(SIZEOF_LENGTH);
                            args.length = len;
                            cb(args);
                            data = data.slice(len + SIZEOF_LENGTH);
                            sz -= len + SIZEOF_LENGTH;
                            break;
                        }
                    case SPROTO_TSTRUCT:
                        {
                            if (sz < SIZEOF_LENGTH) return -1;
                            var len = todword(data);
                            if (sz < len + SIZEOF_LENGTH) return -1;
                            args.value = data.slice(SIZEOF_LENGTH);
                            args.length = len;
                            r = cb(args);
                            if (r != 0) return r;
                            data = data.slice(len + SIZEOF_LENGTH);
                            sz -= len + SIZEOF_LENGTH;
                            break;
                        }
                    default:
                        return -1;
                }
            }
            return 0;
        }

        function decode(args) {
            var self = args.ud;
            var value;
            if (self.deep >= ENCODE_DEEPLEVEL) {
                alert("the table is too deep");
            }

            if (args.index != 0) {
                if (args.tagname != self.array_tag) {
                    self.array_tag = args.tagname;
                    self.result[args.tagname] = new Array();
                    if (args.index < 0) {
                        return 0;
                    }
                }
            }

            switch (args.type) {
                case SPROTO_TINTEGER:
                    {
                        if (args.extra) {
                            var v = args.value;
                            var vn = v;
                            value = vn / args.extra;
                        } else {
                            value = args.value;
                        }
                        break;
                    }
                case SPROTO_TDOUBLE:
                    {
                        value = args.value;
                        break
                    }
                case SPROTO_TBOOLEAN:
                    {
                        if (args.value == 1) {
                            value = true;
                        } else if (args.value == 0) {
                            value = false;
                        } else {
                            value = null;
                        }
                        break;
                    }
                case SPROTO_TSTRING:
                    {
                        var arr = new Array();
                        for (var i = 0; i < args.length; i++) {
                            arr.push(args.value[i]);
                        }
                        if (args.extra){
                            value = arr;
                        } else {
                            value = netutils.utf82string(arr);
                        }
                        
                        break;
                    }
                case SPROTO_TSTRUCT:
                    {
                        var sub = new Object();
                        var r;
                        sub.deep = self.deep + 1;
                        sub.array_index = 0;
                        sub.array_tag = null;
                        sub.result = new Object();
                        if (args.mainindex >= 0) {
                            sub.mainindex_tag = args.mainindex;
                            r = sproto_decode(args.subtype, args.value, args.length, decode, sub);
                            if (r < 0 || r != args.length) {
                                return r;
                            }
                            value = sub.result;
                            break;
                        } else {
                            sub.mainindex_tag = -1;
                            sub.key_index = 0;
                            r = sproto_decode(args.subtype, args.value, args.length, decode, sub);
                            if (r < 0) {
                                return SPROTO_CB_ERROR;
                            }
                            if (r != args.length)
                                return r;
                            value = sub.result;
                            break;
                        }
                    }
                default:
                    alert("Invalid type");
            }

            if (args.index > 0) {
                self.result[args.tagname][args.index - 1] = value;
            } else {
                self.result[args.tagname] = value;
            }

            return 0;
        }

        function querytype(sp, typename) {
                if (sp.tcache.has(typename)){
                    return sp.tcache.get(typename);
                }
                var typeinfo = sproto_type(sp, typename);
                if (typeinfo){
                    sp.tcache.set(typename, typeinfo);
                    return typeinfo;
                }
                return null;
        }

        function protocol(sp, pname) {
                var tag = null;
                var name = null;

                if (typeof(pname) == "number") {
                    tag = pname;
                    name = sproto_protoname(sp, pname);
                    if (!name)
                        return null;
                } else {
                    tag = sproto_prototag(sp, pname);
                    name = pname;

                    if (tag === -1) return null;
                }

                var request = sproto_protoquery(sp, tag, SPROTO_REQUEST);
                var response = sproto_protoquery(sp, tag, SPROTO_RESPONSE);
                return {
                    tag: tag,
                    name: name,
                    request: request,
                    response: response
                };
        }

        function queryproto(sp, pname) {
                if (sp.pcache.has(pname)){
                    return sp.pcache.get(pname);
                }
                var protoinfo = protocol(sp, pname);
                if (protoinfo){
                    sp.pcache.set(protoinfo.name, protoinfo);
                    sp.pcache.set(protoinfo.tag, protoinfo);
                    return protoinfo;
                }
                return null;
            }

            sp.queryproto = function(protocolName){
                return queryproto(sp, protocolName);
            };
            sp.dump = function() {
                sproto_dump(this);
            }

        sp.objlen = function(type, inbuf) {
            var st = null;
            if (typeof(type) === "string" || typeof(type) === "number") {
                st = querytype(sp, type);
                if (st == null) {
                    return null;
                }
            } else {
                st = type;
            }

            var ud = new Object();
            ud.array_tag = null;
            ud.deep = 0;
            ud.result = new Object();
            return sproto_decode(st, inbuf, inbuf.length, decode, ud);
        }

        sp.encode = function(type, indata) {
            var self = new Object();

            var st = null;
            if (typeof(type) === "string" || typeof(type) === "number") {
                st = querytype(sp, type);
                if (st == null)
                    return null;
            } else {
                st = type;
            }

            var tbl_index = 2;
            var enbuffer = new Array();
            var buffer_idx = 0;
            self.st = st;
            self.tbl_index = tbl_index;
            self.indata = indata;
            for (;;) {
                self.array_tag = null;
                self.array_index = 0;
                self.deep = 0;
                self.iter_index = tbl_index + 1;
                var r = sproto_encode(st, enbuffer, buffer_idx, encode, self);
                if (r < 0) {
                    return null;
                } else {
                    return enbuffer;
                }
            }
        }

        sp.decode = function(type, inbuf) {
            var st = null;
            if (typeof(type) === "string" || typeof(type) === "number") {
                st = querytype(sp, type);
                if (st == null) {
                    return null;
                }
            } else {
                st = type;
            }

            var buffer = inbuf;
            var sz = inbuf.length;
            var ud = new Object();
            ud.array_tag = null;
            ud.deep = 0;
            ud.result = new Object();
            var r = sproto_decode(st, buffer, sz, decode, ud);
            if (r < 0) {
                return null;
            }

            return ud.result;
        }

        sp.pack = function(inbuf) {
            return t.pack(inbuf);
        }

        sp.unpack = function(inbuf) {
            return t.unpack(inbuf);
        }

        sp.pencode = function(type, inbuf) {
            var obuf = sp.encode(type, inbuf);
            if (obuf == null) {
                return null;
            }
            return sp.pack(obuf);
        }

        sp.pdecode = function(type, inbuf) {
            var obuf = sp.unpack(inbuf);
            if (obuf == null) {
                return null;
            }
            return sp.decode(type, obuf);
        }

        return sp;
    }

    t.createNew = function(buffer) {
        // Convert buffer to array if needed
        var data;
        if (buffer instanceof ArrayBuffer) {
            data = Array.from(new Uint8Array(buffer));
        } else if (buffer instanceof Uint8Array) {
            data = Array.from(buffer);
        } else {
            data = buffer;
        }

        var sp = sproto_create(data);
        
        // Parse the .spb buffer to extract type and protocol information
        var offset = 0;
        
        // Read number of types
        if (data.length < 4) {
            throw new Error("Invalid sproto buffer: too short");
        }
        
        var typeCount = todword(data.slice(offset));
        offset += 4;
        
        sp.type = {};
        sp.protocol = {};
        
        // Parse types
        for (var i = 0; i < typeCount; i++) {
            if (offset + 8 > data.length) break;
            
            var nameLen = todword(data.slice(offset));
            offset += 4;
            var dataLen = todword(data.slice(offset));
            offset += 4;
            
            if (offset + nameLen > data.length) break;
            
            var nameBytes = data.slice(offset, offset + nameLen);
            var typeName = netutils.utf82string(nameBytes);
            offset += nameLen;
            
            if (offset + dataLen > data.length) break;
            
            var typeData = data.slice(offset, offset + dataLen);
            offset += dataLen;
            
            // Parse type structure
            sp.type[typeName] = parseTypeData(typeData);
        }
        
        // Parse protocols if there's more data
        if (offset < data.length) {
            var protocolCount = todword(data.slice(offset));
            offset += 4;
            
            for (var j = 0; j < protocolCount; j++) {
                if (offset + 12 > data.length) break;
                
                var tag = todword(data.slice(offset));
                offset += 4;
                var nameLen = todword(data.slice(offset));
                offset += 4;
                var requestLen = todword(data.slice(offset));
                offset += 4;
                var responseLen = todword(data.slice(offset));
                offset += 4;
                
                if (offset + nameLen > data.length) break;
                
                var nameBytes = data.slice(offset, offset + nameLen);
                var protoName = netutils.utf82string(nameBytes);
                offset += nameLen;
                
                var request = null;
                var response = null;
                
                if (requestLen > 0 && offset + requestLen <= data.length) {
                    var requestName = netutils.utf82string(data.slice(offset, offset + requestLen));
                    request = sp.type[requestName];
                    offset += requestLen;
                }
                
                if (responseLen > 0 && offset + responseLen <= data.length) {
                    var responseName = netutils.utf82string(data.slice(offset, offset + responseLen));
                    response = sp.type[responseName];
                    offset += responseLen;
                }
                
                sp.protocol[tag] = {
                    name: protoName,
                    request: request,
                    response: response
                };
            }
        }
        
        return sp;
    };
    
    function parseTypeData(data) {
        var fields = [];
        var offset = 0;
        
        if (data.length < 4) return fields;
        
        var fieldCount = todword(data.slice(offset));
        offset += 4;
        
        for (var i = 0; i < fieldCount; i++) {
            if (offset + 16 > data.length) break;
            
            var tag = todword(data.slice(offset));
            offset += 4;
            var type = todword(data.slice(offset));
            offset += 4;
            var nameLen = todword(data.slice(offset));
            offset += 4;
            var extra = todword(data.slice(offset));
            offset += 4;
            
            if (offset + nameLen > data.length) break;
            
            var nameBytes = data.slice(offset, offset + nameLen);
            var fieldName = netutils.utf82string(nameBytes);
            offset += nameLen;
            
            fields.push({
                tag: tag,
                name: fieldName,
                type: type,
                extra: extra,
                key: -1,
                st: null
            });
        }
        
        return fields;
    }

    t.pack = function(data) {
        // Simple packing implementation
        return data;
    };

    t.unpack = function(data) {
        // Simple unpacking implementation
        return data;
    };

    return t;
}());

// Support both CommonJS and ES modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = sproto;
} else if (typeof window !== 'undefined') {
    window.sproto = sproto;
}