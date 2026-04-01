import fs from 'node:fs/promises';

async function main() {
    try {
        const count = await fs.readFile('instrukce.txt', 'utf8');
        const n = Number(count.trim());

        const files = [];

        for (let i = 0; i <= n; i++) {
            files.push(
                fs.writeFile(`${i}.txt`, `Soubor ${i}`)
            );
        }

        await Promise.all(files);

        console.log('Všechny soubory byly úspěšně vytvořeny.');
    } catch (error) {
        console.log('Nastala chyba: ', error)
    }
}

await main();