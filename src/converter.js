"use strict";
/**
 * Runtime message from/to plain object converters.
 * @namespace
 */
var converter = exports;

var Enum = require("./enum"),
    util = require("./util");

/**
 * Generates a partial value fromObject conveter.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} prop Property reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genValuePartial_fromObject(gen, field, fieldIndex, prop) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) { gen
            ("switch(d%s){", prop);
            for (var values = field.resolvedType.values, keys = Object.keys(values), i = 0; i < keys.length; ++i) {
                if (field.repeated && values[keys[i]] === field.typeDefault) gen
                ("default:");
                gen
                ("case%j:", GetEnumValueName(field.resolvedType.name,keys[i]))
                ("case %i:", values[keys[i]])
                    ("m%s=%j", prop, values[keys[i]])
                    ("break");
            } gen
            ("}");
        } else gen
            ("if(typeof d%s!==\"object\")", prop)
                ("throw TypeError(%j)", field.fullName + ": object expected")
            ("m%s=types[%i].fromObject(d%s)", prop, fieldIndex, prop);
    } else {
        var isUnsigned = false;
        switch (field.type) {
            case "double":
            case "float": gen
                ("m%s=Number(d%s)", prop, prop); // also catches "NaN", "Infinity"
                break;
            case "uint32":
            case "fixed32": gen
                ("m%s=d%s>>>0", prop, prop);
                break;
            case "int32":
            case "sint32":
            case "sfixed32": gen
                ("m%s=d%s|0", prop, prop);
                break;
            case "uint64":
                isUnsigned = true;
                // eslint-disable-line no-fallthrough
            case "int64":
            case "sint64":
            case "fixed64":
            case "sfixed64": gen
                ("if(typeof d%s===\"string\"||typeof d%s===\"number\"||typeof d%s===\"bigint\")", prop, prop, prop)
                    ("m%s=BigInt(d%s)", prop, prop)
                ("else if(typeof d%s===\"object\")", prop)
                    ("m%s=new util.LongBits(d%s.low>>>0,d%s.high>>>0).toBigInt(%s)", prop, prop, prop, isUnsigned);
                break;
            case "bytes": gen
                ("if(typeof d%s===\"string\")", prop)
                    ("util.base64.decode(d%s,m%s=util.newBuffer(util.base64.length(d%s)),0)", prop, prop, prop)
                ("else if(d%s.length >= 0)", prop)
                    ("m%s=d%s", prop, prop);
                break;
            case "string": gen
                ("m%s=String(d%s)", prop, prop);
                break;
            case "bool": gen
                ("m%s=Boolean(d%s)", prop, prop);
                break;
            /* default: gen
                ("m%s=d%s", prop, prop);
                break; */
        }
    }
    return gen;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}

/**
 * Generates a plain object to runtime message converter specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
converter.fromObject = function fromObject(mtype) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var fields = mtype.fieldsArray;
    var gen = util.codegen(["d"], mtype.name + "$fromObject")
    ("if(d instanceof this.ctor)")
        ("return d");
    if (!fields.length) return gen
    ("return new this.ctor");
    gen
    ("var m=new this.ctor");
    for (var i = 0; i < fields.length; ++i) {
        var field  = fields[i].resolve(),
            prop   = util.safeProp(field.name);

        // Map fields
        if (field.map) { gen
    ("if(d%s){", prop)
        ("m%s={}", prop)
        ("for(var ks=Object.keys(d%s),i=0;i<ks.length;++i){", prop);
            genValuePartial_fromObject(gen, field, /* not sorted */ i, prop + "[ks[i]]")
        ("}")
    ("}");

        // Repeated fields
        } else if (field.repeated) { gen
    ("if(d%s){", prop)
        ("if(!Array.isArray(d%s))", prop)
            ("throw TypeError(%j)", field.fullName + ": array expected")
        ("m%s=[]", prop)
        ("for(var i=0;i<d%s.length;++i){", prop);
            genValuePartial_fromObject(gen, field, /* not sorted */ i, prop + "[i]")
        ("}")
    ("}");

        // Non-repeated fields
        } else {
            if (!(field.resolvedType instanceof Enum)) gen // no need to test for null/undefined if an enum (uses switch)
    ("if(d%s!=null){", prop); // !== undefined && !== null
        genValuePartial_fromObject(gen, field, /* not sorted */ i, prop);
            if (!(field.resolvedType instanceof Enum)) gen
    ("}");
        }
    }

    var result = gen("return m");
    return result;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
};

/**
 * Generates a partial value toObject converter.
 * @param {Codegen} gen Codegen instance
 * @param {Field} field Reflected field
 * @param {number} fieldIndex Field index
 * @param {string} prop Property reference
 * @returns {Codegen} Codegen instance
 * @ignore
 */
function genValuePartial_toObject(gen, field, fieldIndex, prop) {
    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    if (field.resolvedType) {
        if (field.resolvedType instanceof Enum) gen
            ("d%s=o.enums===String?types[%i].values[m%s]:m%s", prop, fieldIndex, prop, prop);
        else gen
            ("d%s=types[%i].toObject(m%s,o)", prop, fieldIndex, prop);
    } else {
        var isUnsigned = false;
        switch (field.type) {
            case "double":
            case "float": gen
            ("d%s=o.json&&!isFinite(m%s)?String(m%s):m%s", prop, prop, prop, prop);
                break;
            case "uint64":
                isUnsigned = true;
                // eslint-disable-line no-fallthrough
            case "int64":
            case "sint64":
            case "fixed64":
            case "sfixed64": gen
                ("d%s=o.longs===String ? util.LongBits.from(m%s).toBigInt(%s).toString(): o.longs===BigInt ? util.LongBits.from(m%s).toBigInt(%s) : m%s", prop, prop, isUnsigned, prop, isUnsigned ? "true": "", prop);
                break;
            case "bytes": gen
            ("d%s=o.bytes===String?util.base64.encode(m%s,0,m%s.length):o.bytes===Array?Array.prototype.slice.call(m%s):m%s", prop, prop, prop, prop, prop);
                break;
            default: gen
            ("d%s=m%s", prop, prop);
                break;
        }
    }
    return gen;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
}

/**
 * Generates a runtime message to plain object converter specific to the specified message type.
 * @param {Type} mtype Message type
 * @returns {Codegen} Codegen instance
 */
converter.toObject = function toObject(mtype) {

    /* eslint-disable no-unexpected-multiline, block-scoped-var, no-redeclare */
    var fields = mtype.fieldsArray.slice().sort(util.compareFieldsById);
    if (!fields.length)
        return util.codegen()("return {}");
    var gen = util.codegen(["m", "o"], mtype.name + "$toObject")
    ("if(!o)")
        ("o={}")
    ("var d={}");

    var repeatedFields = [],
        mapFields = [],
        normalFields = [],
        i = 0;
    for (; i < fields.length; ++i)
        if (!fields[i].partOf)
            ( fields[i].resolve().repeated ? repeatedFields
            : fields[i].map ? mapFields
            : normalFields).push(fields[i]);

    if (repeatedFields.length) { gen
    ("if(o.arrays||o.defaults){");
        for (i = 0; i < repeatedFields.length; ++i) gen
        ("d%s=[]", util.safeProp(repeatedFields[i].name));
        gen
    ("}");
    }

    if (mapFields.length) { gen
    ("if(o.objects||o.defaults){");
        for (i = 0; i < mapFields.length; ++i) gen
        ("d%s={}", util.safeProp(mapFields[i].name));
        gen
    ("}");
    }

    if (normalFields.length) { gen
    ("if(o.defaults){");
        for (i = 0; i < normalFields.length; ++i) {
            var field = normalFields[i],
                prop  = util.safeProp(field.name);
            if (field.resolvedType instanceof Enum) gen
        ("d%s=o.enums===String?%j:%j", prop, GetEnumValueName(field.resolvedType.name, field.resolvedType.valuesById[field.typeDefault]), field.typeDefault);
            else if (field.long) gen
            ("var n=new util.LongBits(%i,%i,%j)", field.typeDefault.low, field.typeDefault.high, field.typeDefault.unsigned)
            ("d%s=o.longs===String?n.toBigInt().toString():o.longs===BigInt?n.toBigInt().toString():n", prop);
            else if (field.bytes) {
                var arrayDefault = "[" + Array.prototype.slice.call(field.typeDefault).join(",") + "]";
                gen
        ("if(o.bytes===String)d%s=%j", prop, String.fromCharCode.apply(String, field.typeDefault))
        ("else{")
            ("d%s=%s", prop, arrayDefault)
            ("if(o.bytes!==Array)d%s=util.newBuffer(d%s)", prop, prop)
        ("}");
            } else gen
        ("d%s=%j", prop, field.typeDefault); // also messages (=null)
        } gen
    ("}");
    }
    var hasKs2 = false;
    for (i = 0; i < fields.length; ++i) {
        var field = fields[i],
            index = mtype._fieldsArray.indexOf(field),
            prop  = util.safeProp(field.name);
        if (field.map) {
            if (!hasKs2) { hasKs2 = true; gen
    ("var ks2");
            } gen
    ("if(m%s&&(ks2=Object.keys(m%s)).length){", prop, prop)
        ("d%s={}", prop)
        ("for(var j=0;j<ks2.length;++j){");
            genValuePartial_toObject(gen, field, /* sorted */ index, prop + "[ks2[j]]")
        ("}");
        } else if (field.repeated) { gen
    ("if(m%s&&m%s.length){", prop, prop)
        ("d%s=[]", prop)
        ("for(var j=0;j<m%s.length;++j){", prop);
            genValuePartial_toObject(gen, field, /* sorted */ index, prop + "[j]")
        ("}");
        } else { gen
    ("if(m%s!=null&&m.hasOwnProperty(%j)){", prop, field.name); // !== undefined && !== null
        genValuePartial_toObject(gen, field, /* sorted */ index, prop);
        if (field.partOf) gen
        ("if(o.oneofs)")
            ("d%s=%j", util.safeProp(field.partOf.name), field.name);
        }
        gen
    ("}");
    }
    const result = gen
        ("return d");
    return result;
    /* eslint-enable no-unexpected-multiline, block-scoped-var, no-redeclare */
};





/**
 * Generates a runtime message to plain object converter specific to the specified message type.
 * @param {String} enum_name Message type
 * @param {String} enum_value_name 
 * @returns {String} RealName instance
 */
function GetEnumValueName(enum_name, enum_value_name)
{
    let stripped = TryRemovePrefix(enum_name, enum_value_name);
    let result = ShoutyToPascalCase(stripped);
    // Just in case we have an enum name of FOO and a value of FOO_2... make sure the returned
    // string is a valid identifier.
    
    if (IsDigit(result.charAt(0)))
    {
        result = "_" + result;
    }
    return result;
}

exports.GetEnumValueName = GetEnumValueName;


function IsDigit(value)
{
    return /^[0-9]$/.test(value)
}


// Attempt to remove a prefix from a value, ignoring casing and skipping underscores.
// (foo, foo_bar) => bar - underscore after prefix is skipped
// (FOO, foo_bar) => bar - casing is ignored
// (foo_bar, foobarbaz) => baz - underscore in prefix is ignored
// (foobar, foo_barbaz) => baz - underscore in value is ignored
// (foo, bar) => bar - prefix isn't matched; return original value

function TryRemovePrefix(prefix, value)
{
    var prefix_to_match = '';
    // First normalize to a lower-case no-underscores prefix to match against
    for (let i = 0; i < prefix.length; i++)
    {
        let c = prefix.charAt(i)
        if (c != '_')
        {
            prefix_to_match += c.toLowerCase();
        }
    }

    // This keeps track of how much of value we've consumed
    let prefix_index, value_index;
    for (prefix_index = 0, value_index = 0;
        prefix_index < prefix_to_match.length && value_index < value.length;
        value_index++)
    {
        // Skip over underscores in the value
        let c = value.charAt(value_index)
        if (c == '_')
        {
            continue;
        }
        if (c != null && c.toLowerCase() != prefix_to_match.charAt(prefix_index++))
        {
            // Failed to match the prefix - bail out early.
            return value;
        }
    }

    // If we didn't finish looking through the prefix, we can't strip it.
    if (prefix_index < prefix_to_match.length)
    {
        return value;
    }

    // Step over any underscores after the prefix
    while (value_index < value.length && value.charAt(value_index) == '_')
    {
        value_index++;
    }

    // If there's nothing left (e.g. it was a prefix with only underscores afterwards), don't strip.
    if (value_index == value.length)
    {
        return value;
    }

    let c = value.substr(value_index);
    return c;
}


function IsLetterOrDigit(char)
{
    return /^[a-zA-Z0-9]$/.test(char);
}

// Convert a string which is expected to be SHOUTY_CASE (but may not be *precisely* shouty)
// into a PascalCase string. Precise rules implemented:

// Previous input character      Current character         Case
// Any                           Non-alphanumeric          Skipped
// None - first char of input    Alphanumeric              Upper
// Non-letter (e.g. _ or 1)      Alphanumeric              Upper
// Numeric                       Alphanumeric              Upper
// Lower letter                  Alphanumeric              Same as current
// Upper letter                  Alphanumeric              Lower
function ShoutyToPascalCase(input)
{
    var result = ""
    // Simple way of implementing "always start with upper"
    var previous = '_';
    for (let i = 0; i < input.length; i++)
    {
        let current = input.charAt(i);
        if (!IsLetterOrDigit(current))
        {
            previous = current;
            continue;
        }
        if (!IsLetterOrDigit(previous))
        {
            result += current.toUpperCase();
        }
        else if (IsDigit(previous))
        {
            result += current.toUpperCase();
        }
        else if (/^[a-z]$/.test(previous))
        {
            result += (current);
        }
        else
        {
            result += (current.toLowerCase());
        }
        previous = current;
    }
    return result;
}