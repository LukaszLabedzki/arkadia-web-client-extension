/**
 * Jadalnia (Dining Hall) Automation Plugin
 *
 * This plugin automates eating in the dining hall when the user types `/jadalnia_ra`.
 * It detects available food on the table, sits down, eats until full, drinks water,
 * and then stands up.
 *
 * Migrated from old Mudlet scripts to the new plugin system.
 *
 * How to use:
 * 1. Build: yarn build:examples
 * 2. Add to client via Scripts section: http://localhost:3030/plugins/jadalnia-plugin.js
 * 3. Type `/jadalnia_ra` in the game to activate
 */

import type { PluginApi, PluginInfo } from '@arkadia/plugin-types';

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

export async function init(api: PluginApi): Promise<PluginInfo> {
    const tag = "jadalnia";

    // State management
    let isActive = false;
    let autoCleanupTimeout: number | null = null;

    const cleanup = () => {
        // Remove all triggers with our tag
        api.triggers.removeByTag(tag);

        // Clear timeout
        if (autoCleanupTimeout !== null) {
            clearTimeout(autoCleanupTimeout);
            autoCleanupTimeout = null;
        }

        isActive = false;
    };

    const startEating = async () => {
        // If already active, don't start again
        if (isActive) {
            api.output.print("Automatyzacja jadalnia jest już aktywna!");
            return;
        }

        isActive = true;

        // Register main table trigger - detects when we're looking at the table
        api.triggers.register(
            TABLE_TRIGGER_PATTERNS,
            () => {
                // This trigger just stays active to enable food detection
                return undefined;
            },
            tag
        );

        // Register food detection triggers
        // These fire when we see food on the table
        FOOD_PATTERNS.forEach(food => {
            api.triggers.register(
                food.pattern,
                () => {
                    if (!isActive) return undefined;

                    // Bind the eating command to functional key
                    const fullCommand = `usiadz przy stole;${food.command}`;
                    api.bind.set(fullCommand);

                    return undefined;
                },
                tag
            );
        });

        // Register fullness trigger (when can't eat more, drink water)
        api.triggers.register(
            FULLNESS_PATTERNS,
            () => {
                if (!isActive) return undefined;

                api.bind.set("poczestuj sie woda");
                return undefined;
            },
            tag
        );

        // Register drinking water trigger (keeps drinking)
        api.triggers.register(
            DRINKING_WATER_PATTERN,
            () => {
                if (!isActive) return undefined;

                api.bind.set("poczestuj sie woda");
                return undefined;
            },
            tag
        );

        // Register can't drink trigger (stand up and cleanup)
        api.triggers.register(
            CANT_DRINK_PATTERN,
            () => {
                if (!isActive) return undefined;

                api.bind.set("wstan");

                // Cleanup after standing up
                setTimeout(() => {
                    cleanup();
                    api.output.print("Automatyzacja jadalnia zakończona.");
                }, 100);

                return undefined;
            },
            tag
        );

        // Send "spojrz" command after a short delay to trigger food detection
        setTimeout(async () => {
            await api.command.send("spojrz", false);
        }, 100);

        // Auto-cleanup after 10 seconds if not cleaned up by triggers
        // This prevents the triggers from staying active forever
        autoCleanupTimeout = setTimeout(() => {
            if (isActive) {
                cleanup();
                api.output.print("Automatyzacja jadalnia wygasła (timeout).");
            }
        }, 10000) as unknown as number;

        api.output.print("Automatyzacja jadalnia uruchomiona. Szukam jedzenia...");
    };

    // Register the /jadalnia_ra alias
    api.aliases.register(/^\/jadalnia_ra$/, () => {
        startEating();
        return true; // Prevent command from being sent to server
    });

    // Also register a stop command
    api.aliases.register(/^\/jadalnia_stop$/, () => {
        if (isActive) {
            cleanup();
            api.output.print("Automatyzacja jadalnia zatrzymana.");
        } else {
            api.output.print("Automatyzacja jadalnia nie jest aktywna.");
        }
        return true;
    });

    return {
        name: "Jadalnia Automation",
        version: "1.0.0",
        author: "RA Scripts Migration",
        description: "Automatyzuje jedzenie w jadalniach. Użyj /jadalnia_ra aby rozpocząć, /jadalnia_stop aby zatrzymać."
    };
}

export async function destroy(): Promise<void> {
    console.log("[Jadalnia Plugin] Wyładowywanie...");
    // Triggers will be automatically cleaned up by the plugin system
}
