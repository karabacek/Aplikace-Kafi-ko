const apiUrl="http://lmpss3.dev.spsejecna.net/procedure2.php";
const username = "coffe";
const password = "kafe";

function make_base_auth(user, password) {
    return "Basic " + btoa(user + ":" + password);
}

const AUTH_HEADER = make_base_auth(username, password);
let drinkTypes=[];

async function loadUsers(){
    const res=await fetch(`${apiUrl}?cmd=getPeopleList`,{credentials:"include", headers: {
            "Authorization": AUTH_HEADER
        }});
    const data=await res.json();
    const userSelect=document.getElementById("userSelect");
    const allUsersDiv=document.getElementById("allUsers");
    allUsersDiv.innerHTML="";
    Object.values(data).forEach(user=>{
        const option=document.createElement("option");
        option.value=user.ID;
        option.textContent=user.name;
        userSelect.appendChild(option);

        const p=document.createElement("p");
        p.textContent=`${user.ID} - ${user.name}`;
        allUsersDiv.appendChild(p);
    });
}

async function loadDrinks(){
    const res=await fetch(`${apiUrl}?cmd=getTypesList`,{credentials:"include", headers: {
            "Authorization": AUTH_HEADER
        }});
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

        minusBtn.addEventListener("click",()=>{ input.value=Math.max(0, Number(input.value)-1); });
        plusBtn.addEventListener("click",()=>{ input.value=Number(input.value)+1; });

        amountControl.appendChild(minusBtn);
        amountControl.appendChild(input);
        amountControl.appendChild(plusBtn);

        row.appendChild(label);
        row.appendChild(amountControl);
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
        messageDiv.style.color="red";
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
            headers:{"Content-Type":"application/json", "Authorization": AUTH_HEADER},
            body:JSON.stringify(bodyData)
        });
        if(!res.ok) throw new Error(`HTTP ${res.status}`);
        await res.json();
        messageDiv.textContent="Data byla odeslána!";
        messageDiv.style.color="green";
    }catch(err){
        messageDiv.textContent="Chyba při odesílání!";
        messageDiv.style.color="red";
        console.error(err);
    }
}

document.addEventListener("DOMContentLoaded",async()=>{
    await loadUsers();
    await loadDrinks();
    document.getElementById("submitBtn").addEventListener("click",submitDrink);
});