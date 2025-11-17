/**
 * RA Skrypty Plugin
 *
 * This plugin combines multiple automation scripts from the old Arkadia-RA package:
 * - Jadalnia (Dining Hall) automation
 * - Stones (Kamienie) - shows magical stone effects
 *
 * Migrated from old Mudlet scripts to the new plugin system.
 *
 * How to use:
 * 1. Build: yarn build:examples
 * 2. Add to client via Scripts section: http://localhost:3030/plugins/ra-skrypty.js
 * 3. Commands:
 *    - /jadalnia_ra - start dining hall automation
 *    - /jadalnia_stop - stop dining hall automation
 *    - /kamienie_info - show all stone information
 */

import type { PluginApi, PluginInfo, AnsiAwareBuffer } from '@arkadia/plugin-types';

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
    // Plugin Info
    // ========================================================================

    return {
        name: "RA Skrypty",
        version: "1.0.0",
        author: "RA Scripts Migration",
        description: "Automatyzacja jadalnia + info o kamieniach. Uzyj: /jadalnia_ra, /jadalnia_stop, /kamienie_info"
    };
}

export async function destroy(): Promise<void> {
    console.log("[RA Skrypty Plugin] Wyladowywanie...");
    // Triggers will be automatically cleaned up by the plugin system
}
