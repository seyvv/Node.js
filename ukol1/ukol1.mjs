const randNumber = Math.floor(Math.random() * 11);

let tip = Number(prompt("Uhodni číslo od 0 do 10, máš na to 5 pokusů:"));

const tries = 5;
let attempts = 1;
let win = false;

while (attempts <= tries) {
    if (tip === randNumber) {
        console.log("Gratulace, uhodl jsi! Bylo to číslo " + randNumber + ".");
        win = true;
        break;
    } else if (tip > randNumber) {
        console.log("Zadal jsi číslo větší než hádané číslo, zkus to znovu. Zbývá ti " + (tries - attempts) + " pokusů.");
    } else if (tip < randNumber) {
        console.log("Zadal jsi číslo menší než hádané číslo, zkus to znovu. Zbývá ti " + (tries - attempts) + " pokusů.");
    }
    attempts++;
    if (attempts <= tries && !win) {
        tip = Number(prompt("Zadej číslo od 0 do 10:"));
    }
}

if (!win) {
    console.log(`Bohužel, neuhodl jsi. Hádané číslo bylo ${randNumber}.`);
}