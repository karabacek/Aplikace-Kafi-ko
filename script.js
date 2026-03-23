const apiUrl="http://lmpss3.dev.spsejecna.net/procedure2.php";
const username = "coffe";
const password = "kafe";

function make_base_auth(user, password) {
    return "Basic " + btoa(user + ":" + password);
}

const AUTH_HEADER = make_base_auth(username, password);
let drinkTypes=[];

function setCookie(name, value, days=7) {
    const expires = new Date(Date.now() + days*86400000).toUTCString();
    document.cookie = name + "=" + value + "; expires=" + expires + "; path=/";
}

function getCookie(name) {
    return document.cookie.split("; ").find(row => row.startsWith(name+"="))?.split("=")[1];
}

async function loadUsers(){
    const res=await fetch(`${apiUrl}?cmd=getPeopleList`,{
        credentials:"include",
        headers:{"Authorization": AUTH_HEADER}
    });

    const data=await res.json();

    const userSelect=document.getElementById("userSelect");
    const allUsersDiv=document.getElementById("allUsers");

    allUsersDiv.innerHTML="";
    userSelect.innerHTML="";

    Object.values(data).forEach(user=>{
        const option=document.createElement("option");
        option.value=user.ID;
        option.textContent=user.name;
        userSelect.appendChild(option);

        const p=document.createElement("p");
        p.textContent=`${user.ID} - ${user.name}`;
        allUsersDiv.appendChild(p);
    });

    const savedUser =
        localStorage.getItem("selectedUser") ||
        sessionStorage.getItem("selectedUser") ||
        getCookie("selectedUser");

    if(savedUser){
        userSelect.value = savedUser;
    }

    userSelect.addEventListener("change",()=>{
        const val=userSelect.value;
        localStorage.setItem("selectedUser",val);
        sessionStorage.setItem("selectedUser",val);
        setCookie("selectedUser",val);
    });
}

async function loadDrinks(){
    const res=await fetch(`${apiUrl}?cmd=getTypesList`,{
        credentials:"include",
        headers:{"Authorization": AUTH_HEADER}
    });

    const data=await res.json();
    drinkTypes=Object.values(data);

    const drinkInputs=document.getElementById("drinkInputs");
    const allDrinksDiv=document.getElementById("allDrinks");

    drinkInputs.innerHTML="";
    allDrinksDiv.innerHTML="";

    drinkTypes.forEach(drink=>{
        const row=document.createElement("div");
        row.className="drinkRow";

        const label=document.createElement("label");
        label.textContent=drink.typ;

        const amountControl=document.createElement("div");
        amountControl.className="amountControl";

        const minusBtn=document.createElement("button");
        minusBtn.type="button";
        minusBtn.textContent="-";

        const input=document.createElement("input");
        input.type="number";
        input.min="0";
        input.value="0";
        input.dataset.drinkId=drink.ID;
        input.classList.add("drinkAmount");

        const plusBtn=document.createElement("button");
        plusBtn.type="button";
        plusBtn.textContent="+";

        minusBtn.onclick=()=> input.value=Math.max(0, Number(input.value)-1);
        plusBtn.onclick=()=> input.value=Number(input.value)+1;

        amountControl.append(minusBtn,input,plusBtn);
        row.append(label,amountControl);
        drinkInputs.appendChild(row);

        const p=document.createElement("p");
        p.textContent=`${drink.ID} - ${drink.typ}`;
        allDrinksDiv.appendChild(p);
    });
}

async function submitDrink(){

    const userId=document.getElementById("userSelect").value;
    const messageDiv=document.getElementById("message");

    if(!userId){
        messageDiv.textContent="Vyberte uživatele!";
        return;
    }

    const inputs=document.querySelectorAll(".drinkAmount");

    const drinks=drinkTypes.map(drink=>{
        const input=[...inputs].find(i=>i.dataset.drinkId==drink.ID);
        return { type: drink.typ, value: Number(input.value)||0 };
    });

    const bodyData={ user:userId, drinks:drinks };

    try{
        const res=await fetch(`${apiUrl}?cmd=saveDrinks`,{
            method:"POST",
            credentials:"include",
            headers:{
                "Content-Type":"application/json",
                "Authorization": AUTH_HEADER
            },
            body:JSON.stringify(bodyData)
        });

        if(!res.ok) throw new Error();

        await res.json();

        messageDiv.textContent="Uloženo!";
        messageDiv.style.color="green";

    }catch{
        messageDiv.textContent="Chyba!";
        messageDiv.style.color="red";
    }
}

document.addEventListener("DOMContentLoaded",async()=>{
    await loadUsers();
    await loadDrinks();
    document.getElementById("submitBtn").onclick=submitDrink;
});