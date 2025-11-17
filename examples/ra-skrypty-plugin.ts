/**
 * RA Skrypty Plugin
 *
 * This plugin combines multiple automation scripts from the old Arkadia-RA package:
 * - Jadalnia (Dining Hall) automation
 * - Stones (Kamienie) - shows magical stone effects
 * - Wrog - sends mail to present players with current location
 * - Keygivers (Kluczodajki) - full system with authorization and database
 *
 * Migrated from old Mudlet scripts to the new plugin system.
 *
 * How to use:
 * 1. Build: yarn build:examples
 * 2. Add to client via Scripts section: http://localhost:3030/plugins/ra-skrypty-plugin.js
 * 3. Commands:
 *
 *    Jadalnia:
 *    - /jadalnia_ra - start dining hall automation
 *    - /jadalnia_stop - stop dining hall automation
 *
 *    Stones:
 *    - /kamienie_info - show all stone information
 *
 *    Wrog:
 *    - /wrog [text] - send mail to "obecni" with current location + signature
 *    - /wrog2 [text] - send mail to "obecni" with current location (no signature)
 *
 *    Keygivers:
 *    - /ustaw_autoryzacje_ra <role> <password> - set authorization (one-time setup)
 *    - /ustaw_autoryzacje_ra! <role> <password> - force overwrite authorization
 *    - /ra_zaloguj - manual login
 *    - /ra_pobierz_dane - download/refresh keygivers data
 *    - /kluczodajki [distance|search] - list keygivers (default 150 steps)
 *    - /dropy [hours] - show recent drops (default 24h)
 *    - /klucze_dodaj <keygiver>[#<drop>][#<date>] - add drop to database
 *      Examples:
 *        /klucze_dodaj smok - add keygiver kill without drop
 *        /klucze_dodaj smok#klucz - add keygiver kill with drop
 *        /klucze_dodaj smok#2025.01.15 14:30 - add with custom date
 *        /klucze_dodaj smok#klucz#2025.01.15 14:30 - add with drop and custom date
 */

import type { PluginApi, PluginInfo, AnsiAwareBuffer } from '@arkadia/plugin-types';

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_KEYS = {
    RA_LOGIN_ROLE: 'ra_login_role',
    RA_LOGIN_PASSWORD: 'ra_login_password_encrypted',
    RA_LOGIN_TOKEN: 'ra_login_token',
    RA_LOGIN_TIMESTAMP: 'ra_login_timestamp',
    KEYGIVERS_DATA: 'ra_keygivers_data',
    KEYGIVERS_DROPS: 'ra_keygivers_drops',
    KEYS_DATA: 'ra_keys_data',
} as const;

// ============================================================================
// Keygivers Types
// ============================================================================

interface KeygiverLocation {
    locationId: number;
    name: string;
}

interface Keygiver {
    id: string;
    name: string;
    short: string;
    description: string;
    playersToComplete: number;
    respawnTime: number | string;
    domain: string;
    locations: KeygiverLocation[];
}

interface KeyDrop {
    id: string;
    name: string;
    domain: string;
}

interface KeygiverDrop {
    dropDate: number;
    nextRespawnDate: number;
    keyGiver: {
        id: string;
        name: string;
    };
    drop?: {
        id: string;
        name: string;
    };
}

interface KeygiversState {
    keygivers: Keygiver[];
    drops: KeygiverDrop[];
    keys: KeyDrop[];
    token: string | null;
    tokenTimestamp: number;
}

// ============================================================================
// Keygivers Configuration
// ============================================================================

const KEYGIVERS_CONFIG = {
    // Use Netlify proxy: /api/ra/* -> https://ra.codefx.net/*
    // This avoids CORS issues by proxying through the same origin
    API_BASE_URL: '/api/ra',
    LOGIN_ENDPOINT: '/api/auth/login',
    KEYGIVERS_ENDPOINT: '/api/keygivers',
    DROPS_ENDPOINT: '/api/keygivers/drops',
    KEYS_ENDPOINT: '/api/keys',
    TOKEN_TIMEOUT: 4 * 60 * 60 * 1000, // 4 hours in milliseconds
    AUTO_REFRESH_INTERVAL: 60 * 60 * 1000, // 1 hour
    DISCORD_WEBHOOKS: {
        MAGIKEN: 'https://discord.com/api/webhooks/1142727053196664883/trzmwTP_fUVSpthQg6XnMQvALA9kB2xvCEakHzYMBvMHOvAVrSyj_5TFjI_ePCD72mUA',
        TIMERY: 'https://discord.com/api/webhooks/1142880846496407552/t5RbTc0KB_gEX3t390cOGzRr2zDmYkPujTc9k8myj4-BA_iCTTOybm8dPKOiNFIq_w2g',
    }
} as const;

/**
 * Build API URL using Netlify proxy
 */
function buildApiUrl(endpoint: string): string {
    return KEYGIVERS_CONFIG.API_BASE_URL + endpoint;
}

// ============================================================================
// Simple Encryption/Decryption (Base64)
// ============================================================================

function encryptPassword(password: string): string {
    return btoa(password);
}

function decryptPassword(encrypted: string): string {
    try {
        return atob(encrypted);
    } catch {
        return '';
    }
}

// ============================================================================
// Jadalnia (Dining Hall) Types and Constants
// ============================================================================

interface FoodPattern {
    pattern: string | RegExp;
    command: string;
}

const FOOD_PATTERNS: FoodPattern[] = [
    // Soup
    {
        pattern: "duza, porcelanowa waza wypelniona zupa Le Virtu",
        command: "poczestuj sie zupa"
    },
    // Pizza variations
    {
        pattern: " duzy talerz zajety przez okragla pizze, pelna najrozniejszych owocow morza.",
        command: "poczestuj sie pizza"
    },
    {
        pattern: "spory talerz pelen pysznej pizzy Campogrotta.",
        command: "poczestuj sie pizza"
    },
    {
        pattern: "spory talerz pelen pysznej pizzy Miragliano.",
        command: "poczestuj sie pizza"
    },
    {
        pattern: "spory talerz pelen pysznej szarlotki posypanej cukrem pudrem.",
        command: "poczestuj sie szarlotka"
    },
    // Pasta variations
    {
        pattern: "ogromna micha z zawsze goracym, parujacym makaronem.",
        command: "poczestuj sie makaronem"
    },
    {
        pattern: "ogromna micha z zawsze goracym, parujacym spaghetti bolognese.",
        command: "poczestuj sie makaronem"
    },
    {
        pattern: "ogromna micha z zawsze goracym, parujacym spaghetti z sosem genuenskim.",
        command: "poczestuj sie makaronem"
    },
    {
        pattern: "ogromna micha z zawsze goracym, parujacym spaghetti, ktore cale pokryte jest zolta, gesta masa",
        command: "poczestuj sie makaronem"
    },
    {
        pattern: "misa pelna parujacego makaronu i ustawia ja na stole.",
        command: "poczestuj sie makaronem"
    },
    // Other foods
    {
        pattern: "spory polmisek wypelniony malutkimi, kwadratowymi pierozkami ravioli",
        command: "poczestuj sie pierozkami"
    },
    {
        pattern: "spory talerz pelen malych, przyrzadzonych z wielka dbaloscia o walory estetyczne, tartinek.",
        command: "poczestuj sie tartinka"
    },
    {
        pattern: "spory talerz pelen niezwykle intensywnie pachnacych maslanych buleczek ulozonych w zgrabny stosik.",
        command: "poczestuj sie buleczka"
    },
    {
        pattern: "polmisek zawierajacy aromatycznego, pieczonego pstraga z makaronem",
        command: "poczestuj sie pstragiem"
    }
];

const TABLE_TRIGGER_PATTERNS = [
    "Na srodku stolu stoi",
    "Centralne miejsce stolu zajmuje",
    "Do pomieszczenia wchodzi dziewka sluzebna z nowa"
];

const FULLNESS_PATTERNS = [
    /przelknac ani .* wiecej/,
    /Spostrzegasz, ze oproznil.s juz caly talerz/,
    "jednak jestes tak najedzon.",
    "jednak jestes juz tak najedzon."
];

const DRINKING_WATER_PATTERN = "Napelniasz szklanke woda z dzbana, zblizasz do ust i wypijasz.";
const CANT_DRINK_PATTERN = /Nie jestes w stanie wmusic w siebie ani lyka wiecej\./;

// ============================================================================
// Roman Numeral Converter
// ============================================================================

const ROMAN_MAP: Record<string, number> = {
    I: 1,
    V: 5,
    X: 10,
    L: 50,
    C: 100,
    D: 500,
    M: 1000,
    A: 5000,
    R: 10000,
};

const ROMAN_NUMBERS = [1, 5, 10, 50, 100, 500, 1000, 5000, 10000];
const ROMAN_CHARS = ["I", "V", "X", "L", "C", "D", "M", "A", "R"];

/**
 * Convert a number to Roman numerals
 * Based on arkadia-ra/roman_numeral_converter.lua
 */
function toRomanNumerals(num: number): string {
    if (!num || num !== num) throw new Error("Unable to convert to number");
    if (num === Infinity) throw new Error("Unable to convert infinity");

    num = Math.floor(num);
    if (num <= 0) return num.toString();

    let ret = "";
    let s = num;

    for (let i = ROMAN_NUMBERS.length - 1; i >= 0; i--) {
        const romanNum = ROMAN_NUMBERS[i];
        while (s - romanNum >= 0 && s > 0) {
            ret += ROMAN_CHARS[i];
            s -= romanNum;
        }

        for (let j = 0; j < i; j++) {
            const n2 = ROMAN_NUMBERS[j];
            if (s - (romanNum - n2) >= 0 && s < romanNum && s > 0 && romanNum - n2 !== n2) {
                ret += ROMAN_CHARS[j] + ROMAN_CHARS[i];
                s -= (romanNum - n2);
                break;
            }
        }
    }

    return ret;
}

// ============================================================================
// Stones (Kamienie) Types and Constants
// ============================================================================

interface StoneInfo {
    effect: string;
    color: string;
}

// Map of stone names to their magical effects and colors
// Based on arkadia-ra/stones.lua
const STONES_INFO: Record<string, StoneInfo> = {
    // Pure Magic (+10/+20) - Magenta/Purple
    "fioletowy ametyst": { effect: "czysta magia [+10]", color: "#af00d7" },
    "fioletowe ametysty": { effect: "czysta magia [+10]", color: "#af00d7" },
    "fioletowych ametystow": { effect: "czysta magia [+10]", color: "#af00d7" },
    "wielobarwny oliwin": { effect: "czysta magia [+20]", color: "#af00d7" },
    "wielobarwne oliwiny": { effect: "czysta magia [+20]", color: "#af00d7" },
    "wielobarwnych oliwinow": { effect: "czysta magia [+20]", color: "#af00d7" },
    "lazurowy kyanit": { effect: "czysta magia [+20]", color: "#af00d7" },
    "lazurowe kyanity": { effect: "czysta magia [+20]", color: "#af00d7" },
    "lazurowych kyanitow": { effect: "czysta magia [+20]", color: "#af00d7" },
    "skrzacy aleksandryt": { effect: "czysta magia [+20]", color: "#af00d7" },
    "skrzace aleksandryty": { effect: "czysta magia [+20]", color: "#af00d7" },
    "skrzacych aleksandrytow": { effect: "czysta magia [+20]", color: "#af00d7" },
    "wielobarwny labrador": { effect: "czysta magia [+10]", color: "#af00d7" },
    "wielobarwne labradory": { effect: "czysta magia [+10]", color: "#af00d7" },
    "wielobarwnych labradorow": { effect: "czysta magia [+10]", color: "#af00d7" },

    // Electricity (+10/+20) - Light Yellow
    "szaroniebieski granat": { effect: "elektrycznosc [+20]", color: "#ffff5f" },
    "szaroniebieskie granaty": { effect: "elektrycznosc [+20]", color: "#ffff5f" },
    "szaroniebieskich granatow": { effect: "elektrycznosc [+20]", color: "#ffff5f" },
    "wzorzysty onyks": { effect: "elektrycznosc [+10]", color: "#ffff5f" },
    "wzorzyste onyksy": { effect: "elektrycznosc [+10]", color: "#ffff5f" },
    "wzorzystych onyksow": { effect: "elektrycznosc [+10]", color: "#ffff5f" },
    "wielobarwny turmalin": { effect: "elektrycznosc [+20]", color: "#ffff5f" },
    "wielobarwne turmaliny": { effect: "elektrycznosc [+20]", color: "#ffff5f" },
    "wielobarwnych turmalinow": { effect: "elektrycznosc [+20]", color: "#ffff5f" },

    // Acid (+10/+20) - Lawn Green
    "szmaragdowozielony chryzoberyl": { effect: "kwas [+10]", color: "#7cfc00" },
    "szmaragdowozielone chryzoberyle": { effect: "kwas [+10]", color: "#7cfc00" },
    "szmaragdowozielonych chryzoberylow": { effect: "kwas [+10]", color: "#7cfc00" },
    "zielony diopsyd": { effect: "kwas [+20]", color: "#7cfc00" },
    "zielone diopsydy": { effect: "kwas [+20]", color: "#7cfc00" },
    "zielonych diopsydow": { effect: "kwas [+20]", color: "#7cfc00" },
    "zielonkawy awenturyn": { effect: "kwas [+10]", color: "#7cfc00" },
    "zielonkawe awenturyny": { effect: "kwas [+10]", color: "#7cfc00" },
    "zielonkawych awenturynow": { effect: "kwas [+10]", color: "#7cfc00" },
    "oliwkowozielony serpentyn": { effect: "kwas [+10]", color: "#7cfc00" },
    "oliwkowozielone serpentyny": { effect: "kwas [+10]", color: "#7cfc00" },
    "oliwkowozielonych serpentynow": { effect: "kwas [+10]", color: "#7cfc00" },
    "zoltawozielony szmaragd": { effect: "kwas [+20]", color: "#7cfc00" },
    "zoltawozielone szmaragdy": { effect: "kwas [+20]", color: "#7cfc00" },
    "zoltawozielonych szmaragdow": { effect: "kwas [+20]", color: "#7cfc00" },
    "ciemnozielony malachit": { effect: "kwas [+10]", color: "#7cfc00" },
    "ciemnozielone malachity": { effect: "kwas [+10]", color: "#7cfc00" },
    "ciemnozielonych malachitow": { effect: "kwas [+10]", color: "#7cfc00" },
    "jasnozielony chryzopraz": { effect: "kwas [+10]", color: "#7cfc00" },
    "jasnozielone chryzoprazy": { effect: "kwas [+10]", color: "#7cfc00" },
    "jasnozielonych chryzoprazow": { effect: "kwas [+10]", color: "#7cfc00" },

    // Death Magic (+10/+20) - Dark Slate Gray
    "nakrapiany jaspis": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "nakrapiane jaspisy": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "nakrapianych jaspisow": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czarny gagat": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czarne gagaty": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czarnych gagatow": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "szaroczarny hematyt": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "szaroczarne hematyty": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "szaroczarnych hematytow": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czerwonobrazowy karneol": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czerwonobrazowe karneole": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czerwonobrazowych karneolow": { effect: "magia smierci [+10]", color: "#2f4f4f" },
    "czarny opal": { effect: "magia smierci [+20]", color: "#2f4f4f" },
    "czarne opale": { effect: "magia smierci [+20]", color: "#2f4f4f" },
    "czarnych opali": { effect: "magia smierci [+20]", color: "#2f4f4f" },

    // Mind Magic (+10/+20) - Light Cyan
    "bezbarwny ortoklaz": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "bezbarwne ortoklazy": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "bezbarwnych ortoklazow": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "pasiasty fluoryt": { effect: "magia umyslu [+10]", color: "#00ffff" },
    "pasiaste fluoryty": { effect: "magia umyslu [+10]", color: "#00ffff" },
    "pasiastych fluorytow": { effect: "magia umyslu [+10]", color: "#00ffff" },
    "bialy opal": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "biale opale": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "bialych opali": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "zlocisty piryt": { effect: "magia umyslu [+10]", color: "#00ffff" },
    "zlociste piryty": { effect: "magia umyslu [+10]", color: "#00ffff" },
    "zlocistych pirytow": { effect: "magia umyslu [+10]", color: "#00ffff" },
    "bezbarwny diament": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "bezbarwne diamenty": { effect: "magia umyslu [+20]", color: "#00ffff" },
    "bezbarwnych diamentow": { effect: "magia umyslu [+20]", color: "#00ffff" },

    // Fire (+10/+20/+30) - Red
    "krwistoczerwony rubin": { effect: "ogien [+20]", color: "#ff0000" },
    "krwistoczerwone rubiny": { effect: "ogien [+20]", color: "#ff0000" },
    "krwistoczerwonych rubinow": { effect: "ogien [+20]", color: "#ff0000" },
    "ognisty agat": { effect: "ogien [+10]", color: "#ff0000" },
    "ogniste agaty": { effect: "ogien [+10]", color: "#ff0000" },
    "ognistych agatow": { effect: "ogien [+10]", color: "#ff0000" },
    "krwisty rodolit": { effect: "ogien [+10]", color: "#ff0000" },
    "krwiste rodolity": { effect: "ogien [+10]", color: "#ff0000" },
    "krwistych rodolitow": { effect: "ogien [+10]", color: "#ff0000" },
    "ciemnoczerwony topaz": { effect: "ogien [+30]", color: "#ff0000" },
    "ciemnoczerwone topazy": { effect: "ogien [+30]", color: "#ff0000" },
    "ciemnoczerwonych topazow": { effect: "ogien [+30]", color: "#ff0000" },
    "zoltawozielony apatyt": { effect: "ogien [+20]", color: "#ff0000" },
    "zoltawozielone apatyty": { effect: "ogien [+20]", color: "#ff0000" },
    "zoltawozielonych apatytow": { effect: "ogien [+20]", color: "#ff0000" },

    // Air (+10/+20) - Light Goldenrod
    "niebieski azuryt": { effect: "powietrze [+10]", color: "#eedd82" },
    "niebieskie azuryty": { effect: "powietrze [+10]", color: "#eedd82" },
    "niebieskich azurytow": { effect: "powietrze [+10]", color: "#eedd82" },
    "purpurowoniebieski lazuryt": { effect: "powietrze [+10]", color: "#eedd82" },
    "purpurowoniebieskie lazuryty": { effect: "powietrze [+10]", color: "#eedd82" },
    "purpurowoniebieskich lazurytow": { effect: "powietrze [+10]", color: "#eedd82" },
    "fioletowy szafir": { effect: "powietrze [+20]", color: "#eedd82" },
    "fioletowe szafiry": { effect: "powietrze [+20]", color: "#eedd82" },
    "fioletowych szafirow": { effect: "powietrze [+20]", color: "#eedd82" },
    "jasnozielony nefryt": { effect: "powietrze [+10]", color: "#eedd82" },
    "jasnozielone nefryty": { effect: "powietrze [+10]", color: "#eedd82" },
    "jasnozielonych nefrytow": { effect: "powietrze [+10]", color: "#eedd82" },

    // Water (+20/+30) - Dodger Blue
    "niebieskozielony akwamaryn": { effect: "woda [+20]", color: "#1e90ff" },
    "niebieskozielone akwamaryny": { effect: "woda [+20]", color: "#1e90ff" },
    "niebieskozielonych akwamarynow": { effect: "woda [+20]", color: "#1e90ff" },
    "purpurowy iolit": { effect: "woda [+20]", color: "#1e90ff" },
    "purpurowe iolity": { effect: "woda [+20]", color: "#1e90ff" },
    "purpurowych iolitow": { effect: "woda [+20]", color: "#1e90ff" },
    "czarna perla": { effect: "woda [+30]", color: "#1e90ff" },
    "czarna perle": { effect: "woda [+30]", color: "#1e90ff" },
    "czarne perly": { effect: "woda [+30]", color: "#1e90ff" },
    "czarnych perel": { effect: "woda [+30]", color: "#1e90ff" },
    "biala perla": { effect: "woda [+20]", color: "#1e90ff" },
    "biala perle": { effect: "woda [+20]", color: "#1e90ff" },
    "biale perly": { effect: "woda [+20]", color: "#1e90ff" },
    "bialych perel": { effect: "woda [+20]", color: "#1e90ff" },

    // Earth (+10/+20/+30) - Orange Red
    "zoltawobrazowy monacyt": { effect: "ziemia [+10]", color: "#ff4500" },
    "zoltawobrazowe monacyty": { effect: "ziemia [+10]", color: "#ff4500" },
    "zoltawobrazowych monacytow": { effect: "ziemia [+10]", color: "#ff4500" },
    "lilioworozowy spinel": { effect: "ziemia [+20]", color: "#ff4500" },
    "lilioworozowe spinele": { effect: "ziemia [+20]", color: "#ff4500" },
    "lilioworozowych spineli": { effect: "ziemia [+20]", color: "#ff4500" },
    "bezbarwny gorski krysztal": { effect: "ziemia [+10]", color: "#ff4500" },
    "bezbarwne gorskie krysztaly": { effect: "ziemia [+10]", color: "#ff4500" },
    "bezbarwnych gorskich krysztalow": { effect: "ziemia [+10]", color: "#ff4500" },
    "brazowy tytanit": { effect: "ziemia [+30]", color: "#ff4500" },
    "brazowe tytanity": { effect: "ziemia [+30]", color: "#ff4500" },
    "brazowych tytanitow": { effect: "ziemia [+30]", color: "#ff4500" },
    "szary obsydian": { effect: "ziemia [+10]", color: "#ff4500" },
    "szare obsydiany": { effect: "ziemia [+10]", color: "#ff4500" },
    "szarych obsydianow": { effect: "ziemia [+10]", color: "#ff4500" },
    "brazowy kwarc": { effect: "ziemia [+10]", color: "#ff4500" },
    "brazowe kwarce": { effect: "ziemia [+10]", color: "#ff4500" },
    "brazowych kwarcow": { effect: "ziemia [+30]", color: "#ff4500" },

    // Cold (+10/+20) - Cyan
    "niebieski turkus": { effect: "zimno [+10]", color: "#00ffff" },
    "niebieskie turkusy": { effect: "zimno [+10]", color: "#00ffff" },
    "niebieskich turkusow": { effect: "zimno [+10]", color: "#00ffff" },
    "niebieskawy zoisyt": { effect: "zimno [+20]", color: "#00ffff" },
    "niebieskawe zoisyty": { effect: "zimno [+20]", color: "#00ffff" },
    "niebieskawych zoisytow": { effect: "zimno [+20]", color: "#00ffff" },
    "blekitny almandyn": { effect: "zimno [+20]", color: "#00ffff" },
    "blekitne almandyny": { effect: "zimno [+20]", color: "#00ffff" },
    "blekitnych almandynow": { effect: "zimno [+20]", color: "#00ffff" },

    // Life Magic - Ghost White
    "jasnozloty heliodor": { effect: "magia zycia", color: "#f8f8ff" },
    "jasnozlote heliodory": { effect: "magia zycia", color: "#f8f8ff" },
    "jasnozlotych heliodorow": { effect: "magia zycia", color: "#f8f8ff" },
    "zolty cyrkon": { effect: "magia zycia", color: "#f8f8ff" },
    "zolte cyrkony": { effect: "magia zycia", color: "#f8f8ff" },
    "zoltych cyrkonow": { effect: "magia zycia", color: "#f8f8ff" },
    "zolty celestyn": { effect: "magia zycia", color: "#f8f8ff" },
    "zolte celestyny": { effect: "magia zycia", color: "#f8f8ff" },
    "zoltych celestynow": { effect: "magia zycia", color: "#f8f8ff" },
    "zoltawobrazowy bursztyn": { effect: "magia zycia", color: "#f8f8ff" },
    "zoltawobrazowe bursztyny": { effect: "magia zycia", color: "#f8f8ff" },
    "zoltawobrazowych bursztynow": { effect: "magia zycia", color: "#f8f8ff" },
    "rozowy rodochrozyt": { effect: "magia zycia", color: "#f8f8ff" },
    "rozowe rodochrozyty": { effect: "magia zycia", color: "#f8f8ff" },
    "rozowych rodochrozytow": { effect: "magia zycia", color: "#f8f8ff" },
    "jaskrawozolty cytryn": { effect: "magia zycia", color: "#f8f8ff" },
    "jaskrawozolte cytryny": { effect: "magia zycia", color: "#f8f8ff" },
    "jaskrawozoltych cytrynow": { effect: "magia zycia", color: "#f8f8ff" }
};

// ============================================================================
// Plugin Initialization
// ============================================================================

export async function init(api: PluginApi): Promise<PluginInfo> {
    const jadalnia_tag = "ra-jadalnia";
    const stones_tag = "ra-stones";

    // ========================================================================
    // Jadalnia State Management
    // ========================================================================

    let isJadalniaActive = false;
    let autoCleanupTimeout: number | null = null;

    const jadalniaCleanup = () => {
        api.triggers.removeByTag(jadalnia_tag);
        if (autoCleanupTimeout !== null) {
            clearTimeout(autoCleanupTimeout);
            autoCleanupTimeout = null;
        }
        isJadalniaActive = false;
    };

    const startEating = async () => {
        if (isJadalniaActive) {
            api.output.print("Automatyzacja jadalnia jest juz aktywna!");
            return;
        }

        isJadalniaActive = true;

        // Register main table trigger
        api.triggers.register(
            TABLE_TRIGGER_PATTERNS,
            () => {
                return undefined;
            },
            jadalnia_tag
        );

        // Register food detection triggers
        FOOD_PATTERNS.forEach(food => {
            api.triggers.register(
                food.pattern,
                () => {
                    if (!isJadalniaActive) return undefined;
                    const fullCommand = `usiadz przy stole;${food.command}`;
                    api.bind.set(fullCommand);
                    return undefined;
                },
                jadalnia_tag
            );
        });

        // Register fullness trigger
        api.triggers.register(
            FULLNESS_PATTERNS,
            () => {
                if (!isJadalniaActive) return undefined;
                api.bind.set("poczestuj sie woda");
                return undefined;
            },
            jadalnia_tag
        );

        // Register drinking water trigger
        api.triggers.register(
            DRINKING_WATER_PATTERN,
            () => {
                if (!isJadalniaActive) return undefined;
                api.bind.set("poczestuj sie woda");
                return undefined;
            },
            jadalnia_tag
        );

        // Register can't drink trigger
        api.triggers.register(
            CANT_DRINK_PATTERN,
            () => {
                if (!isJadalniaActive) return undefined;
                api.bind.set("wstan");
                setTimeout(() => {
                    jadalniaCleanup();
                    api.output.print("Automatyzacja jadalnia zakonczona.");
                }, 100);
                return undefined;
            },
            jadalnia_tag
        );

        // Send spojrz command
        setTimeout(async () => {
            await api.command.send("spojrz", false);
        }, 100);

        // Auto-cleanup timeout
        autoCleanupTimeout = setTimeout(() => {
            if (isJadalniaActive) {
                jadalniaCleanup();
                api.output.print("Automatyzacja jadalnia wygasla (timeout).");
            }
        }, 10000) as unknown as number;

        api.output.print("Automatyzacja jadalnia uruchomiona. Szukam jedzenia...");
    };

    // ========================================================================
    // Stones (Kamienie) Setup
    // ========================================================================

    // Register triggers for all stone names
    for (const [stoneName, stoneInfo] of Object.entries(STONES_INFO)) {
        api.triggers.register(
            stoneName,
            (line: AnsiAwareBuffer) => {
                const text = line.text;
                const index = text.indexOf(stoneName);

                if (index !== -1) {
                    // Calculate the replacement text
                    const replacement = `${stoneName} (${stoneInfo.effect})`;
                    const range: [number, number] = [index, index + stoneName.length];

                    // Replace the stone name with name + effect
                    line.replace(range, replacement);

                    // Color the stone name in light black (gray)
                    const stoneNameEnd = index + stoneName.length;
                    line.color([index, stoneNameEnd], api.colors.fromHex('#767676'));

                    // Color the effect part in the appropriate color
                    const effectStart = stoneNameEnd + 2; // " (" = 2 chars
                    const effectEnd = effectStart + stoneInfo.effect.length;
                    line.color([effectStart, effectEnd], api.colors.fromHex(stoneInfo.color));
                }

                return line;
            },
            stones_tag
        );
    }

    // ========================================================================
    // Aliases
    // ========================================================================

    // Jadalnia aliases
    api.aliases.register(/^\/jadalnia_ra$/, () => {
        startEating();
        return true;
    });

    api.aliases.register(/^\/jadalnia_stop$/, () => {
        if (isJadalniaActive) {
            jadalniaCleanup();
            api.output.print("Automatyzacja jadalnia zatrzymana.");
        } else {
            api.output.print("Automatyzacja jadalnia nie jest aktywna.");
        }
        return true;
    });

    // Stones info alias
    api.aliases.register(/^\/kamienie_info$/, () => {
        const buffer = new api.AnsiAwareBuffer("\n\n\tDostepne informacje o kamieniach i ich wlasciwosciach:\n\n");

        // Group stones by effect type for better readability
        const grouped: Record<string, Array<{ name: string, info: StoneInfo }>> = {};

        for (const [name, info] of Object.entries(STONES_INFO)) {
            // Get the base effect (without the +X part)
            const baseEffect = info.effect.split('[')[0].trim();
            if (!grouped[baseEffect]) {
                grouped[baseEffect] = [];
            }
            grouped[baseEffect].push({ name, info });
        }

        // Print grouped stones
        for (const [effect, stones] of Object.entries(grouped)) {
            const effectBuffer = new api.AnsiAwareBuffer(`\n${effect}:\n`, api.colors.fromHex('#00ff00'));
            buffer.appendBuffer(effectBuffer);

            // Only show one variant of each stone (singular form)
            const seen = new Set<string>();
            for (const { name, info } of stones) {
                // Skip plural forms (they contain 'e ' or 'ych ')
                if (name.includes('e ') || name.includes('ych ')) continue;

                const baseName = name.split(' ')[1] || name; // Get the stone type
                if (seen.has(baseName)) continue;
                seen.add(baseName);

                const stoneBuffer = new api.AnsiAwareBuffer(`  - ${name} `, api.colors.fromHex('#ffffff'));
                const effectTextBuffer = new api.AnsiAwareBuffer(info.effect, api.colors.fromHex(info.color));
                stoneBuffer.appendBuffer(effectTextBuffer);
                stoneBuffer.append("\n");
                buffer.appendBuffer(stoneBuffer);
            }
        }

        buffer.append("\n");
        api.output.print(buffer);
        return true;
    });

    // ========================================================================
    // /wrog and /wrog2 Aliases - Send mail to "obecni" with current location
    // ========================================================================

    /**
     * Helper function to send mail about enemy encounter
     * @param additionalText - Optional additional text to add to the mail
     * @param withSignature - Whether to add signature (character name)
     */
    const sendWrogMail = async (additionalText: string, withSignature: boolean) => {
        const wrog_tag = "ra-wrog-mail";

        // Get current room ID from GMCP first, then fall back to map API
        const gmcp = api.gmcp.get();
        let roomId: number | undefined;

        // Try GMCP first (gmcp.room.info.num or gmcp.room.info.id)
        if (gmcp?.room?.info?.num) {
            roomId = gmcp.room.info.num;
        } else if (gmcp?.room?.info?.id) {
            roomId = gmcp.room.info.id;
        } else {
            // Fall back to map API
            const room = api.map.getRoom();
            roomId = room?.id;
        }

        if (!roomId) {
            api.output.print("Nie mozna wyslac listu - nie znaleziono aktualnej lokacji.");
            return;
        }

        // Convert room ID to roman numerals
        const roomIdRoman = toRomanNumerals(roomId);

        // Get character name for signature
        const charName = gmcp?.char?.info?.name || "";
        const signature = charName ? charName.charAt(0).toUpperCase() + charName.slice(1).toLowerCase() : "";

        // Compose mail content
        const preText = " ";
        const content = `Dalsze informacje wydaja sie slabo czytelne. Mozesz rozroznic jedynie nastepujece znaki: ${roomIdRoman}`;
        const additionalPart = additionalText.trim() ? ` ${additionalText.trim()}` : "";
        const postText = withSignature && signature ? ` ${signature}` : "";

        // Send mail command
        await api.command.send("napisz list", true);
        await api.command.send("obecni", true);
        await api.command.send("Wrog", true);
        await api.command.send(" ", true);

        // Register temporary trigger to handle editor
        api.triggers.registerOneTime(
            /Wpisz ~\?, zeby uzyskac pomoc, lub \*\*, by zakonczyc edycje\./,
            async () => {
                // Send mail content
                await api.command.send(preText, false);
                await api.command.send(content, false);
                if (additionalPart) {
                    await api.command.send(additionalPart, false);
                }
                await api.command.send(postText, false);
                await api.command.send("**", true);

                return undefined;
            },
            wrog_tag
        );

        // Auto-cleanup trigger after 10 seconds
        setTimeout(() => {
            api.triggers.removeByTag(wrog_tag);
        }, 10000);
    };

    // /wrog with additional text
    api.aliases.register(/^\/wrog (.+)$/, (matches) => {
        const additionalText = matches?.[1] || "";
        sendWrogMail(additionalText, true);
        return true;
    });

    // /wrog without additional text
    api.aliases.register(/^\/wrog$/, () => {
        sendWrogMail("", true);
        return true;
    });

    // /wrog2 with additional text (no signature)
    api.aliases.register(/^\/wrog2 (.+)$/, (matches) => {
        const additionalText = matches?.[1] || "";
        sendWrogMail(additionalText, false);
        return true;
    });

    // /wrog2 without additional text (no signature)
    api.aliases.register(/^\/wrog2$/, () => {
        sendWrogMail("", false);
        return true;
    });

    // ========================================================================
    // Keygivers System - Authorization and Data Management
    // ========================================================================

    /**
     * Keygivers Manager - handles all keygivers-related functionality
     */
    class KeygiversManager {
        private api: PluginApi;
        private state: KeygiversState;
        private autoRefreshTimer: number | null = null;

        constructor(api: PluginApi) {
            this.api = api;
            this.state = {
                keygivers: [],
                drops: [],
                keys: [],
                token: null,
                tokenTimestamp: 0
            };
            this.loadState();
        }

        // ====================================================================
        // Storage Management
        // ====================================================================

        private loadState(): void {
            try {
                const token = localStorage.getItem(STORAGE_KEYS.RA_LOGIN_TOKEN);
                const timestamp = localStorage.getItem(STORAGE_KEYS.RA_LOGIN_TIMESTAMP);
                const keygivers = localStorage.getItem(STORAGE_KEYS.KEYGIVERS_DATA);
                const drops = localStorage.getItem(STORAGE_KEYS.KEYGIVERS_DROPS);
                const keys = localStorage.getItem(STORAGE_KEYS.KEYS_DATA);

                if (token) this.state.token = token;
                if (timestamp) this.state.tokenTimestamp = parseInt(timestamp);
                if (keygivers) this.state.keygivers = JSON.parse(keygivers);
                if (drops) this.state.drops = JSON.parse(drops);
                if (keys) this.state.keys = JSON.parse(keys);
            } catch (error) {
                console.error('[Keygivers] Error loading state:', error);
            }
        }

        private saveState(): void {
            try {
                if (this.state.token) {
                    localStorage.setItem(STORAGE_KEYS.RA_LOGIN_TOKEN, this.state.token);
                    localStorage.setItem(STORAGE_KEYS.RA_LOGIN_TIMESTAMP, this.state.tokenTimestamp.toString());
                }
                if (this.state.keygivers.length > 0) {
                    localStorage.setItem(STORAGE_KEYS.KEYGIVERS_DATA, JSON.stringify(this.state.keygivers));
                }
                if (this.state.drops.length > 0) {
                    localStorage.setItem(STORAGE_KEYS.KEYGIVERS_DROPS, JSON.stringify(this.state.drops));
                }
                if (this.state.keys.length > 0) {
                    localStorage.setItem(STORAGE_KEYS.KEYS_DATA, JSON.stringify(this.state.keys));
                }
            } catch (error) {
                console.error('[Keygivers] Error saving state:', error);
            }
        }

        // ====================================================================
        // Authentication
        // ====================================================================

        async setAuthorization(role: string, password: string, overwrite: boolean = false): Promise<void> {
            const existingRole = localStorage.getItem(STORAGE_KEYS.RA_LOGIN_ROLE);

            if (existingRole && !overwrite) {
                this.api.output.print("Dane autoryzacji sa juz zapisane. Uzyj /ustaw_autoryzacje_ra! aby nadpisac.");
                return;
            }

            const encrypted = encryptPassword(password);
            localStorage.setItem(STORAGE_KEYS.RA_LOGIN_ROLE, role);
            localStorage.setItem(STORAGE_KEYS.RA_LOGIN_PASSWORD, encrypted);

            this.api.output.print(`Ustawiono dane autoryzacji online dla roli: ${role}`);

            // Auto-login after setting credentials
            await this.login();
        }

        async login(): Promise<boolean> {
            const role = localStorage.getItem(STORAGE_KEYS.RA_LOGIN_ROLE);
            const encryptedPwd = localStorage.getItem(STORAGE_KEYS.RA_LOGIN_PASSWORD);

            if (!role || !encryptedPwd) {
                this.api.output.print("Brak danych autoryzacji. Uzyj /ustaw_autoryzacje_ra <rola> <haslo>");
                return false;
            }

            const password = decryptPassword(encryptedPwd);

            try {
                const url = buildApiUrl(KEYGIVERS_CONFIG.LOGIN_ENDPOINT);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ role, password })
                });

                if (!response.ok) {
                    this.api.output.print(`Blad logowania: ${response.status} ${response.statusText}`);
                    return false;
                }

                const data = await response.json();

                if (data.data && data.data.token) {
                    this.state.token = data.data.token;
                    this.state.tokenTimestamp = Date.now();
                    this.saveState();
                    this.api.output.print("Zalogowano pomyslnie do systemu RA.");

                    // Auto-download data after login
                    await this.downloadAllData();

                    // Setup auto-refresh
                    this.setupAutoRefresh();

                    return true;
                }

                this.api.output.print("Blad: nie otrzymano tokenu autoryzacji.");
                return false;

            } catch (error) {
                this.api.output.print(`Blad polaczenia z serwerem: ${error}`);
                return false;
            }
        }

        isTokenValid(): boolean {
            if (!this.state.token) return false;
            const now = Date.now();
            return (now - this.state.tokenTimestamp) < KEYGIVERS_CONFIG.TOKEN_TIMEOUT;
        }

        async ensureLoggedIn(): Promise<boolean> {
            if (this.isTokenValid()) return true;
            return await this.login();
        }

        private setupAutoRefresh(): void {
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
            }

            this.autoRefreshTimer = setInterval(async () => {
                if (!this.isTokenValid()) {
                    await this.login();
                }
            }, KEYGIVERS_CONFIG.AUTO_REFRESH_INTERVAL) as unknown as number;
        }

        // ====================================================================
        // Data Download
        // ====================================================================

        async downloadAllData(): Promise<void> {
            if (!await this.ensureLoggedIn()) return;

            this.api.output.print("Pobieranie danych kluczodajek...");

            try {
                await Promise.all([
                    this.downloadKeygivers(),
                    this.downloadDrops(),
                    this.downloadKeys()
                ]);

                this.api.output.print("Pobrano dane kluczodajek, dropow i kluczy.");
            } catch (error) {
                this.api.output.print(`Blad pobierania danych: ${error}`);
            }
        }

        private async downloadKeygivers(): Promise<void> {
            const url = buildApiUrl(KEYGIVERS_CONFIG.KEYGIVERS_ENDPOINT);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.data && data.data.keyGivers) {
                this.state.keygivers = data.data.keyGivers;
                this.saveState();
            }
        }

        private async downloadDrops(): Promise<void> {
            const url = buildApiUrl(KEYGIVERS_CONFIG.DROPS_ENDPOINT);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.data && data.data.keyGiversDrops) {
                this.state.drops = data.data.keyGiversDrops;
                this.saveState();
            }
        }

        private async downloadKeys(): Promise<void> {
            const url = buildApiUrl(KEYGIVERS_CONFIG.KEYS_ENDPOINT);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${this.state.token}`
                }
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const data = await response.json();
            if (data.data && data.data.keys) {
                this.state.keys = data.data.keys;
                this.saveState();
            }
        }

        // ====================================================================
        // Display Functions
        // ====================================================================

        displayKeygivers(params?: string): void {
            if (this.state.keygivers.length === 0) {
                this.api.output.print("Brak danych kluczodajek. Uzyj /ra_pobierz_dane");
                return;
            }

            const room = this.api.map.getRoom();
            if (!room) {
                this.api.output.print("Nie mozna wyswietlic kluczodajek - nieznana lokalizacja.");
                return;
            }

            const currentRoomId = room.id;
            let maxSteps = 150;
            let searchStr = "";

            if (params) {
                const num = parseInt(params);
                if (!isNaN(num)) {
                    maxSteps = num;
                } else {
                    searchStr = params.toLowerCase();
                }
            }

            const results: Array<{
                distance: number;
                keygiver: Keygiver;
                location: KeygiverLocation;
            }> = [];

            for (const kg of this.state.keygivers) {
                if (searchStr) {
                    const matchesSearch = kg.name.toLowerCase().includes(searchStr) ||
                                        kg.short.toLowerCase().includes(searchStr);
                    if (!matchesSearch) continue;
                }

                for (const loc of kg.locations) {
                    // In a real implementation, we'd calculate path distance
                    // For now, use simple room ID difference as approximation
                    const distance = Math.abs(currentRoomId - loc.locationId);

                    if (!searchStr && distance > maxSteps) continue;

                    results.push({ distance, keygiver: kg, location: loc });
                }
            }

            if (results.length === 0) {
                this.api.output.print("Nie znaleziono kluczodajek spelniajacych kryteria.");
                return;
            }

            // Sort by distance
            results.sort((a, b) => a.distance - b.distance);

            // Display results
            const buffer = new api.AnsiAwareBuffer();

            if (searchStr) {
                buffer.append(`\n\nKluczodajki pasujace do: ${searchStr}\n\n`, api.colors.fromHex('#ffff00'));
            } else {
                buffer.append(`\n\nKluczodajki w odleglosci ${maxSteps} krokow:\n\n`, api.colors.fromHex('#ffff00'));
            }

            buffer.append("─".repeat(120) + "\n", api.colors.fromHex('#808080'));

            const header = new api.AnsiAwareBuffer();
            header.append("Lokacja   Odleglosc  Resp  #  Kluczodajka                   Opis\n", api.colors.fromHex('#ffff00'));
            buffer.appendBuffer(header);

            buffer.append("─".repeat(120) + "\n", api.colors.fromHex('#808080'));

            for (const result of results.slice(0, 50)) { // Limit to 50 results
                const line = new api.AnsiAwareBuffer();

                const locId = result.location.locationId.toString().padEnd(10);
                const dist = result.distance.toString().padEnd(11);
                const resp = (typeof result.keygiver.respawnTime === 'number' ?
                             result.keygiver.respawnTime.toString() : '-').padEnd(6);
                const players = result.keygiver.playersToComplete.toString().padEnd(3);
                const name = result.keygiver.name.substring(0, 30).padEnd(30);
                const desc = result.keygiver.short.substring(0, 35);

                line.append(locId, api.colors.fromHex('#87ceeb'));
                line.append(dist, api.colors.fromHex('#90ee90'));
                line.append(resp, api.colors.fromHex('#90ee90'));
                line.append(players, api.colors.fromHex('#90ee90'));
                line.append(name, api.colors.fromHex('#00ffff'));
                line.append(desc, api.colors.fromHex('#3cb371'));
                line.append("\n");

                buffer.appendBuffer(line);
            }

            buffer.append("─".repeat(120) + "\n", api.colors.fromHex('#808080'));
            buffer.append(`\nZnaleziono: ${results.length} kluczodajek\n`, api.colors.fromHex('#ffff00'));

            this.api.output.print(buffer);
        }

        displayDrops(hoursBack: number = 24): void {
            if (this.state.drops.length === 0) {
                this.api.output.print("Brak danych o dropach. Uzyj /ra_pobierz_dane");
                return;
            }

            const now = Date.now() / 1000; // Convert to seconds
            const timeWindow = hoursBack * 60 * 60;
            const startTime = now - timeWindow;

            const recentDrops = this.state.drops.filter(drop =>
                drop.dropDate >= startTime && drop.dropDate <= now
            );

            if (recentDrops.length === 0) {
                this.api.output.print(`Brak dropow z ostatnich ${hoursBack}h.`);
                return;
            }

            // Sort by date
            recentDrops.sort((a, b) => b.dropDate - a.dropDate);

            const buffer = new api.AnsiAwareBuffer();
            buffer.append(`\n\nDropy z ostatnich ${hoursBack}h:\n\n`, api.colors.fromHex('#ffff00'));
            buffer.append("─".repeat(110) + "\n", api.colors.fromHex('#808080'));

            const header = new api.AnsiAwareBuffer();
            header.append("Data zabicia        Nast. Resp          Kluczodajka                   Drop\n",
                         api.colors.fromHex('#ffff00'));
            buffer.appendBuffer(header);

            buffer.append("─".repeat(110) + "\n", api.colors.fromHex('#808080'));

            for (const drop of recentDrops) {
                const line = new api.AnsiAwareBuffer();

                const dropDate = new Date(drop.dropDate * 1000).toLocaleString('pl-PL', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }).padEnd(20);

                const respDate = drop.nextRespawnDate > 0 ?
                    new Date(drop.nextRespawnDate * 1000).toLocaleString('pl-PL', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                    }).padEnd(20) : '-'.padEnd(20);

                const kgName = drop.keyGiver.name.substring(0, 30).padEnd(30);
                const dropName = drop.drop ? drop.drop.name.substring(0, 35) : '-';

                line.append(dropDate, api.colors.fromHex('#90ee90'));
                line.append(respDate, api.colors.fromHex('#00ffff'));
                line.append(kgName, api.colors.fromHex('#90ee90'));
                line.append(dropName, api.colors.fromHex('#ffff00'));
                line.append("\n");

                buffer.appendBuffer(line);
            }

            buffer.append("─".repeat(110) + "\n", api.colors.fromHex('#808080'));
            buffer.append(`\nWyswietlono: ${recentDrops.length} dropow\n`, api.colors.fromHex('#ffff00'));

            this.api.output.print(buffer);
        }

        // ====================================================================
        // Add Drop
        // ====================================================================

        async addDrop(keygiverName: string, dropName: string = "", customDate?: string): Promise<void> {
            if (!await this.ensureLoggedIn()) return;

            // Find keygiver
            const keygiver = this.state.keygivers.find(kg =>
                kg.name.toLowerCase() === keygiverName.toLowerCase() ||
                kg.short.toLowerCase() === keygiverName.toLowerCase()
            );

            if (!keygiver) {
                this.api.output.print(`Nie znaleziono kluczodajki: ${keygiverName}`);
                return;
            }

            // Find drop if provided
            let dropKey: KeyDrop | undefined;
            if (dropName) {
                dropKey = this.state.keys.find(k =>
                    k.name.toLowerCase() === dropName.toLowerCase()
                );

                if (!dropKey) {
                    this.api.output.print(`Nie znaleziono dropu: ${dropName}`);
                    return;
                }
            }

            // Parse date if provided
            let dropDate = Math.floor(Date.now() / 1000);
            if (customDate) {
                const match = customDate.match(/(\d+)\.(\d+)\.(\d+) (\d+):(\d+)/);
                if (match) {
                    const [, year, month, day, hour, minute] = match;
                    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day),
                                        parseInt(hour), parseInt(minute));
                    dropDate = Math.floor(date.getTime() / 1000);
                } else {
                    this.api.output.print("Nieprawidlowy format daty. Uzyj: YYYY.MM.DD HH:MM");
                    return;
                }
            }

            // Send to API
            try {
                const payload: any = {
                    keyGiver: keygiver.id,
                    dropDate: dropDate
                };

                if (dropKey) {
                    payload.drop = dropKey.id;
                }

                const url = buildApiUrl(KEYGIVERS_CONFIG.DROPS_ENDPOINT);
                const response = await fetch(url, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.state.token}`
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    this.api.output.print(`Blad dodawania dropu: ${response.status}`);
                    return;
                }

                this.api.output.print("Drop zostal dodany do bazy danych.");

                // Also send to Discord
                await this.sendDiscordNotification(keygiver.name, dropKey?.name, dropDate);

                // Refresh drops data
                setTimeout(() => this.downloadDrops(), 2000);

            } catch (error) {
                this.api.output.print(`Blad: ${error}`);
            }
        }

        private async sendDiscordNotification(keygiverName: string, dropName: string | undefined, dropDate: number): Promise<void> {
            const gmcp = this.api.gmcp.get();
            const userName = gmcp?.char?.info?.name || 'ra scripts';

            const timeStr = new Date(dropDate * 1000).toLocaleTimeString('pl-PL', {
                hour: '2-digit',
                minute: '2-digit'
            });

            let content: string;
            let webhook: string;

            if (dropName) {
                content = `${dropName} - ${keygiverName} - ${timeStr} (${userName})`;
                webhook = KEYGIVERS_CONFIG.DISCORD_WEBHOOKS.MAGIKEN;
            } else {
                content = `${keygiverName} - ${timeStr} (${userName})`;
                webhook = KEYGIVERS_CONFIG.DISCORD_WEBHOOKS.TIMERY;
            }

            try {
                await fetch(webhook, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        content,
                        username: 'Benicjo'
                    })
                });
            } catch (error) {
                console.error('[Keygivers] Discord notification failed:', error);
            }
        }

        destroy(): void {
            if (this.autoRefreshTimer) {
                clearInterval(this.autoRefreshTimer);
            }
        }
    }

    // Create keygivers manager instance
    const keygivers = new KeygiversManager(api);

    // ========================================================================
    // Keygivers Aliases
    // ========================================================================

    // Authorization setup
    api.aliases.register(/^\/ustaw_autoryzacje_ra (\S+) (.+)$/, (matches) => {
        const role = matches?.[1];
        const password = matches?.[2];
        if (role && password) {
            keygivers.setAuthorization(role, password, false);
        }
        return true;
    });

    // Authorization setup (force overwrite)
    api.aliases.register(/^\/ustaw_autoryzacje_ra! (\S+) (.+)$/, (matches) => {
        const role = matches?.[1];
        const password = matches?.[2];
        if (role && password) {
            keygivers.setAuthorization(role, password, true);
        }
        return true;
    });

    // Manual login
    api.aliases.register(/^\/ra_zaloguj$/, async () => {
        await keygivers.login();
        return true;
    });

    // Download all data
    api.aliases.register(/^\/ra_pobierz_dane$/, async () => {
        await keygivers.downloadAllData();
        return true;
    });

    // Display keygivers
    api.aliases.register(/^\/kluczodajki$/, () => {
        keygivers.displayKeygivers();
        return true;
    });

    api.aliases.register(/^\/kluczodajki (.+)$/, (matches) => {
        const params = matches?.[1];
        if (params) {
            keygivers.displayKeygivers(params);
        }
        return true;
    });

    // Display drops
    api.aliases.register(/^\/dropy$/, () => {
        keygivers.displayDrops(24);
        return true;
    });

    api.aliases.register(/^\/dropy (\d+)$/, (matches) => {
        const hours = matches?.[1];
        if (hours) {
            keygivers.displayDrops(parseInt(hours));
        }
        return true;
    });

    // Add drop
    api.aliases.register(/^\/klucze_dodaj (.+)$/, async (matches) => {
        const params = matches?.[1];
        if (!params) return true;

        // Parse: keygiver#drop#date or keygiver#drop or keygiver#date or keygiver
        const parts = params.split('#').map(p => p.trim());

        if (parts.length === 3) {
            // keygiver#drop#date
            await keygivers.addDrop(parts[0], parts[1], parts[2]);
        } else if (parts.length === 2) {
            // Could be keygiver#drop or keygiver#date
            const hasDate = /\d+\.\d+\.\d+ \d+:\d+/.test(parts[1]);
            if (hasDate) {
                await keygivers.addDrop(parts[0], "", parts[1]);
            } else {
                await keygivers.addDrop(parts[0], parts[1]);
            }
        } else if (parts.length === 1) {
            // Just keygiver
            await keygivers.addDrop(parts[0]);
        }

        return true;
    });

    // ========================================================================
    // Plugin Info
    // ========================================================================

    return {
        name: "RA Skrypty",
        version: "2.0.0",
        author: "RA Scripts Migration",
        description: "Pelny system RA: jadalnia, kamienie, wrog, kluczodajki. Uzyj: /ustaw_autoryzacje_ra, /kluczodajki, /dropy, /klucze_dodaj"
    };
}

export async function destroy(): Promise<void> {
    console.log("[RA Skrypty Plugin] Wyladowywanie...");
    // Cleanup keygivers manager
    if (typeof keygivers !== 'undefined' && keygivers) {
        keygivers.destroy();
    }
    // Triggers will be automatically cleaned up by the plugin system
}
