import fs from "node:fs";

async function main() {
    try {
        const instructions = await fs.promises.readFile("instrukce.txt", "utf8");

        const content = instructions.trim(); // odstraní \n na konci
        const [src, dest] = content.split(/\s+/); // rozdělí podle whitespace (mezery, nové řádky, taby)
        if (!src || !dest) {
            console.log("Špatný formát instrukce.txt (měl by obsahovat dva názvy souborů).");
            return;
        }

        const input = await fs.promises.readFile(src, "utf8");
        if (input.trim().length === 0) {
            console.log("Zdrojový soubor je prázdný.");
            return;
        }

        await fs.promises.writeFile(dest, input, "utf8");

    } catch (error) {
        if (error.code === "ENOENT") {
            console.error(`Soubor ${error.path} neexistuje.`);
        } else {
            console.error("Nastala chyba:", error);
        }
    }
}

await main();