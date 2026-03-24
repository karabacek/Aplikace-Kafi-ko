/*
Pro ukládání dat jsem zvolil LocalStorage, protože uchovává informace i po zavření stránky. 
Umožňuje zadávat drinky offline a data se po obnovení připojení odešlou na server. 
SessionStorage by data odstranila po zavření okna, což by nevyhovovalo pro denní přehled.
*/
const apiUrl = "http://lmpss3.dev.spsejecna.net/procedure2.php";
const username = "coffe";
const password = "kafe";

function make_base_auth(user, password) {
    return "Basic " + btoa(user + ":" + password);
}

const AUTH_HEADER = make_base_auth(username, password);
let drinkTypes = [];
let cachedUsers = [];
let cachedDrinks = [];

function setCookie(name, value, days = 7) {
    const expires = new Date(Date.now() + days * 86400000).toUTCString();
    document.cookie = name + "=" + value + "; expires=" + expires + "; path=/";
}

function getCookie(name) {
    return document.cookie.split("; ").find(r => r.startsWith(name + "="))?.split("=")[1];
}

async function loadUsers() {
    const userSelect = document.getElementById("userSelect");
    const allUsersDiv = document.getElementById("allUsers");

    if (!navigator.onLine) {
        const saved = localStorage.getItem("usersCache");
        if (saved) {
            cachedUsers = JSON.parse(saved);
            renderUsers(cachedUsers);
            return;
        }
    }

    try {
        const res = await fetch(`${apiUrl}?cmd=getPeopleList`, {
            credentials: "include",
            headers: { "Authorization": AUTH_HEADER }
        });

        const data = await res.json();
        cachedUsers = Object.values(data);

        localStorage.setItem("usersCache", JSON.stringify(cachedUsers));
        renderUsers(cachedUsers);

    } catch {
        const saved = localStorage.getItem("usersCache");
        if (saved) {
            cachedUsers = JSON.parse(saved);
            renderUsers(cachedUsers);
        }
    }
}

function renderUsers(data) {
    const userSelect = document.getElementById("userSelect");
    const allUsersDiv = document.getElementById("allUsers");
    userSelect.innerHTML = "";
    allUsersDiv.innerHTML = "";

    data.forEach(user => {
        const opt = document.createElement("option");
        opt.value = user.ID;
        opt.textContent = user.name;
        userSelect.appendChild(opt);

        const p = document.createElement("p");
        p.textContent = `${user.ID} - ${user.name}`;
        allUsersDiv.appendChild(p);
    });

    const savedUser =
        localStorage.getItem("selectedUser") ||
        sessionStorage.getItem("selectedUser") ||
        getCookie("selectedUser");

    if (savedUser) userSelect.value = savedUser;

    userSelect.onchange = () => {
        const val = userSelect.value;
        localStorage.setItem("selectedUser", val);
        sessionStorage.setItem("selectedUser", val);
        setCookie("selectedUser", val);
    };
}

async function loadDrinks() {
    if (!navigator.onLine) {
        const saved = localStorage.getItem("drinksCache");
        if (saved) {
            drinkTypes = JSON.parse(saved);
            renderDrinks();
            return;
        }
    }

    try {
        const res = await fetch(`${apiUrl}?cmd=getTypesList`, {
            credentials: "include",
            headers: { "Authorization": AUTH_HEADER }
        });

        drinkTypes = Object.values(await res.json());
        localStorage.setItem("drinksCache", JSON.stringify(drinkTypes));
        renderDrinks();

    } catch {
        const saved = localStorage.getItem("drinksCache");
        if (saved) {
            drinkTypes = JSON.parse(saved);
            renderDrinks();
        }
    }
}

function renderDrinks() {
    const drinkInputs = document.getElementById("drinkInputs");
    const allDrinksDiv = document.getElementById("allDrinks");

    drinkInputs.innerHTML = "";
    allDrinksDiv.innerHTML = "";

    drinkTypes.forEach(drink => {
        const row = document.createElement("div");
        row.className = "drinkRow";

        const label = document.createElement("label");
        label.textContent = drink.typ;

        const controls = document.createElement("div");
        controls.className = "amountControl";

        const minus = document.createElement("button");
        minus.textContent = "-";

        const input = document.createElement("input");
        input.type = "number";
        input.value = "0";
        input.min = "0";
        input.dataset.drinkId = drink.ID;
        input.classList.add("drinkAmount");

        const plus = document.createElement("button");
        plus.textContent = "+";

        minus.onclick = () => input.value = Math.max(0, Number(input.value) - 1);
        plus.onclick = () => input.value = Number(input.value) + 1;

        controls.append(minus, input, plus);
        row.append(label, controls);
        drinkInputs.appendChild(row);

        const p = document.createElement("p");
        p.textContent = `${drink.ID} - ${drink.typ}`;
        allDrinksDiv.appendChild(p);
    });
}

function saveOffline(data) {
    let q = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    q.push(data);
    localStorage.setItem("offlineQueue", JSON.stringify(q));
}

async function sendOffline() {
    if (!navigator.onLine) return;

    let q = JSON.parse(localStorage.getItem("offlineQueue") || "[]");
    if (q.length === 0) return;

    for (const item of q) {
        try {
            await fetch(`${apiUrl}?cmd=saveDrinks`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": AUTH_HEADER
                },
                body: JSON.stringify(item)
            });

            addToDailyReport(item);

        } catch {
            return;
        }
    }
    localStorage.removeItem("offlineQueue");
}

function addToDailyReport(entry) {
    const now = new Date().toLocaleTimeString();
    const entryWithTime = { ...entry, time: now };

    let report = JSON.parse(localStorage.getItem("dailyReport") || "[]");
    report.push(entryWithTime);
    localStorage.setItem("dailyReport", JSON.stringify(report));
    renderDailyReport();
}

function renderDailyReport() {
    const div = document.getElementById("dailyReport");
    div.innerHTML = "";

    let report = JSON.parse(localStorage.getItem("dailyReport") || "[]");

    for (let i = report.length - 1; i >= 0; i--) {
        const r = report[i];
        const name = cachedUsers.find(u => u.ID == r.user)?.name || r.user;
        const drinks = r.drinks
            .filter(d => d.value > 0)
            .map(d => `${d.type} ${d.value}`)
            .join(", ");

        const p = document.createElement("p");
        p.textContent = `${r.time} | ${name}: ${drinks}`;
        div.appendChild(p);
    }
}

async function submitDrink() {
    const userId = document.getElementById("userSelect").value;
    const message = document.getElementById("message");

    if (!userId) {
        message.textContent = "Vyberte uživatele!";
        message.style.color = "red";
        return;
    }

    const inputs = document.querySelectorAll(".drinkAmount");

    const drinks = drinkTypes.map(drink => {
        const input = [...inputs].find(i => i.dataset.drinkId == drink.ID);
        return { type: drink.typ, value: Number(input.value) || 0 };
    });

    const data = { user: userId, drinks };

    if (!navigator.onLine) {
        saveOffline(data);
        message.textContent = "Offline – uloženo lokálně.";
        message.style.color = "orange";
        return;
    }

    try {
        const res = await fetch(`${apiUrl}?cmd=saveDrinks`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                "Authorization": AUTH_HEADER
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) throw new Error();

        await res.json();
        addToDailyReport(data);

        message.textContent = "Uloženo!";
        message.style.color = "green";

    } catch {
        saveOffline(data);
        message.textContent = "API nedostupné – data uložena offline.";
        message.style.color = "orange";
    }
}

document.addEventListener("DOMContentLoaded", async () => {
    await loadUsers();
    await loadDrinks();
    renderDailyReport();
    sendOffline();
    document.getElementById("submitBtn").onclick = submitDrink;
});

window.addEventListener("online", sendOffline);