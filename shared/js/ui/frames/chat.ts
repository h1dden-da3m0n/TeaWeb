import {LogCategory} from "tc-shared/log";
import {settings, Settings} from "tc-shared/settings";
import * as log from "tc-shared/log";
import {bbcode} from "tc-shared/MessageFormatter";
import * as loader from "tc-loader";

export enum ChatType {
    GENERAL,
    SERVER,
    CHANNEL,
    CLIENT
}

declare const xbbcode: any;
export function htmlEscape(message: string) : string[] {
    const div = document.createElement('div');
    div.innerText = message;
    message =  div.innerHTML;
    return message.replace(/ /g, '&nbsp;').split(/<br>/);
}

export function formatElement(object: any, escape_html: boolean = true) : JQuery[] {
    if($.isArray(object)) {
        let result = [];
        for(let element of object)
            result.push(...formatElement(element, escape_html));
        return result;
    } else if(typeof(object) == "string") {
        if(object.length == 0) return [];

        return escape_html ?
            htmlEscape(object).map((entry, idx, array) => $.spawn("a").css("display", (idx == 0 || idx + 1 == array.length ? "inline" : "") + "block").html(entry == "" && idx != 0 ? "&nbsp;" : entry)) :
            [$.spawn("div").css("display", "inline-block").html(object)];
    } else if(typeof(object) === "object") {
        if(object instanceof $)
            return [object as any];
        return formatElement("<unknwon object>");
    } else if(typeof(object) === "function") return formatElement(object(), escape_html);
    else if(typeof(object) === "undefined") return formatElement("<undefined>");
    else if(typeof(object) === "number") return [$.spawn("a").text(object)];
    return formatElement("<unknown object type " + typeof object + ">");
}

export function formatMessage(pattern: string, ...objects: any[]) : JQuery[] {
    let begin = 0, found = 0;

    let result: JQuery[] = [];
    do {
        found = pattern.indexOf('{', found);
        if(found == -1 || pattern.length <= found + 1) {
            result.push(...formatElement(pattern.substr(begin)));
            break;
        }

        if(found > 0 && pattern[found - 1] == '\\') {
            //TODO remove the escape!
            found++;
            continue;
        }

        result.push(...formatElement(pattern.substr(begin, found - begin))); //Append the text

        let offset = 0;
        if(pattern[found + 1] == ':') {
            offset++; /* the beginning : */
            while (pattern[found + 1 + offset] != ':' && found + 1 + offset < pattern.length) offset++;
            const tag = pattern.substr(found + 2, offset - 1);

            offset++; /* the ending : */
            if(pattern[found + offset + 1] != '}' && found + 1 + offset < pattern.length) {
                found++;
                continue;
            }

            result.push($.spawn(tag as any));
        } else {
            let number;
            while ("0123456789".includes(pattern[found + 1 + offset])) offset++;
            number = parseInt(offset > 0 ? pattern.substr(found + 1, offset) : "0");
            if(pattern[found + offset + 1] != '}') {
                found++;
                continue;
            }

            if(objects.length < number)
                log.warn(LogCategory.GENERAL, tr("Message to format contains invalid index (%o)"), number);

            result.push(...formatElement(objects[number]));
        }

        found = found + 1 + offset;
        begin = found + 1;
    } while(found++);

    return result;
}

export function formatMessageString(pattern: string, ...args: string[]) : string {
    let begin = 0, found = 0;

    let result: string[] = [];
    do {
        found = pattern.indexOf('{', found);
        if(found == -1 || pattern.length <= found + 1) {
            result.push(pattern.substr(begin));
            break;
        }

        if(found > 0 && pattern[found - 1] == '\\') {
            //TODO remove the escape!
            found++;
            continue;
        }

        result.push(pattern.substr(begin, found - begin)); //Append the text

        let offset = 0;
        let number;
        while ("0123456789".includes(pattern[found + 1 + offset])) offset++;
        number = parseInt(offset > 0 ? pattern.substr(found + 1, offset) : "0");
        if(pattern[found + offset + 1] != '}') {
            found++;
            continue;
        }

        if(args.length < number)
            log.warn(LogCategory.GENERAL, tr("Message to format contains invalid index (%o)"), number);

        result.push(args[number]);

        found = found + 1 + offset;
        begin = found + 1;
    } while(found++);

    return result.join("");
}

//TODO: Remove this (only legacy)
export function bbcode_chat(message: string) : JQuery[] {
    return bbcode.format(message, {
        is_chat_message: true
    });
}

export namespace network {
    export const KB = 1024;
    export const MB = 1024 * KB;
    export const GB = 1024 * MB;
    export const TB = 1024 * GB;

    export function format_bytes(value: number, options?: {
        time?: string,
        unit?: string,
        exact?: boolean
    }) : string {
        options = options || {};
        if(typeof options.exact !== "boolean")
            options.exact = true;
        if(typeof options.unit !== "string")
            options.unit = "Bytes";

        let points = value.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');

        let v, unit;
        if(value > 2 * TB) {
            unit = "TB";
            v = value / TB;
        } else if(value > GB) {
            unit = "GB";
            v = value / GB;
        } else if(value > MB) {
            unit = "MB";
            v = value / MB;
        } else if(value > KB) {
            unit = "KB";
            v = value / KB;
        } else {
            unit = "";
            v = value;
        }

        let result = "";
        if(options.exact || !unit) {
            result += points;
            if(options.unit) {
                result += " " + options.unit;
                if(options.time)
                    result += "/" + options.time;
            }
        }
        if(unit) {
            result += (result ? " / " : "") + v.toFixed(2) + " " + unit;
            if(options.time)
                result += "/" + options.time;
        }
        return result;
    }
}

export const K = 1000;
export const M = 1000 * K;
export const G = 1000 * M;
export const T = 1000 * G;
export function format_number(value: number, options?: {
    time?: string,
    unit?: string
}) {
    options = Object.assign(options || {}, {});

    let points = value.toFixed(0).replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1,');

    let v, unit;
    if(value > 2 * T) {
        unit = "T";
        v = value / T;
    } else if(value > G) {
        unit = "G";
        v = value / G;
    } else if(value > M) {
        unit = "M";
        v = value / M;
    } else if(value > K) {
        unit = "K";
        v = value / K;
    } else {
        unit = "";
        v = value;
    }
    if(unit && options.time)
        unit = unit + "/" + options.time;
    return points + " " + (options.unit || "") + (unit ? (" / " + v.toFixed(2) + " " + unit) : "");
}

export const TIME_SECOND = 1000;
export const TIME_MINUTE = 60 * TIME_SECOND;
export const TIME_HOUR = 60 * TIME_MINUTE;
export const TIME_DAY = 24 * TIME_HOUR;
export const TIME_WEEK = 7 * TIME_DAY;

export function format_time(time: number, default_value: string) {
    let result = "";
    if(time > TIME_WEEK) {
        const amount = Math.floor(time / TIME_WEEK);
        result += " " + amount + " " + (amount > 1 ? tr("Weeks") : tr("Week"));
        time -= amount * TIME_WEEK;
    }

    if(time > TIME_DAY) {
        const amount = Math.floor(time / TIME_DAY);
        result += " " + amount + " " + (amount > 1 ? tr("Days") : tr("Day"));
        time -= amount * TIME_DAY;
    }

    if(time > TIME_HOUR) {
        const amount = Math.floor(time / TIME_HOUR);
        result += " " + amount + " " + (amount > 1 ? tr("Hours") : tr("Hour"));
        time -= amount * TIME_HOUR;
    }

    if(time > TIME_MINUTE) {
        const amount = Math.floor(time / TIME_MINUTE);
        result += " " + amount + " " + (amount > 1 ? tr("Minutes") : tr("Minute"));
        time -= amount * TIME_MINUTE;
    }

    if(time > TIME_SECOND) {
        const amount = Math.floor(time / TIME_SECOND);
        result += " " + amount + " " + (amount > 1 ? tr("Seconds") : tr("Second"));
        time -= amount * TIME_SECOND;
    }

    return result.length > 0 ? result.substring(1) : default_value;
}

let _icon_size_style: JQuery<HTMLStyleElement>;
export function set_icon_size(size: string) {
    if(!_icon_size_style)
        _icon_size_style = $.spawn("style").appendTo($("#style"));

    _icon_size_style.text("\n" +
        ".message > .emoji {\n" +
        "  height: " + size + "!important;\n" +
        "  width: " + size + "!important;\n" +
        "}\n"
    );
}

loader.register_task(loader.Stage.JAVASCRIPT_INITIALIZING, {
    name: "icon size init",
    function: async () => {
        set_icon_size((settings.static_global(Settings.KEY_ICON_SIZE) / 100).toFixed(2) + "em");
    },
    priority: 10
});