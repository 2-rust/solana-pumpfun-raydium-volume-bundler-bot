"use strict";

// Define the FieldType enum
export var FieldType;
(function (FieldType) {
    FieldType[FieldType["u8"] = 0] = "u8";
    FieldType[FieldType["u32"] = 1] = "u32";
    FieldType[FieldType["u64"] = 2] = "u64";
    FieldType[FieldType["f64"] = 3] = "f64";
})(FieldType || (FieldType = {}));

// Define TYPE_TO_LENGTH
export const TYPE_TO_LENGTH = {
    [FieldType.u8]: 1,
    [FieldType.u32]: 4,
    [FieldType.u64]: 8,
    [FieldType.f64]: 8,
};

// Define FieldDecl class
class FieldDecl {
    constructor(name, type) {
        this.name = name;
        this.type = type;
    }

    getLength() {
        return TYPE_TO_LENGTH[this.type];
    }
}

// Define Parser class
export class Parser {
    constructor(fields = []) {
        this.fields = [];
        this.nameToField = {};
        fields.forEach(field => this.addField(field));
    }

    addField(field) {
        if (field.name in this.nameToField) {
            throw new Error(`${field.name} already present in struct`);
        }
        this.fields.push(field);
        this.nameToField[field.name] = field;
    }

    u8(name) {
        this.addField(new FieldDecl(name, FieldType.u8));
        return this;
    }

    u32(name) {
        this.addField(new FieldDecl(name, FieldType.u32));
        return this;
    }

    u64(name) {
        this.addField(new FieldDecl(name, FieldType.u64));
        return this;
    }

    f64(name) {
        this.addField(new FieldDecl(name, FieldType.f64));
        return this;
    }

    getLength() {
        return this.fields.reduce((total, field) => total + field.getLength(), 0);
    }

    encode(object) {
        let buffer = Buffer.alloc(this.getLength());
        let offset = 0;

        for (let field of this.fields) {
            if (!(field.name in object)) {
                throw new Error(`Object does not contain ${field.name}`);
            }
            let value = object[field.name];

            switch (field.type) {
                case FieldType.u8:
                    buffer.writeUInt8(value, offset);
                    break;
                case FieldType.u32:
                    buffer.writeUInt32LE(value, offset);
                    break;
                case FieldType.u64:
                    buffer.writeUInt32LE(value % 4294967296, offset);
                    buffer.writeUInt32LE(Math.floor(value / 4294967296), offset + 4);
                    break;
                case FieldType.f64:
                    buffer.writeDoubleLE(value, offset);
                    break;
                default:
                    throw new Error(`Unknown field type ${field.type}`);
            }

            offset += field.getLength();
        }

        return buffer;
    }
}