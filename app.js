let people=[]
let results={}

function setPeople(){

people=document
.getElementById("people")
.value.split(",")

updateSelect()

}

function updateSelect(){

let selects=document
.querySelectorAll(".person")

selects.forEach(s=>{

let val=s.value

s.innerHTML=""

let t=document.createElement("option")
t.value="tengah"
t.text="Makan Tengah"

s.appendChild(t)

people.forEach(p=>{

let o=document.createElement("option")
o.value=p.trim()
o.text=p.trim()

s.appendChild(o)

})

s.value=val

})

}

async function scan(){

let file=document
.getElementById("receipt")
.files[0]

if(!file) return

document.getElementById("status")
.innerText="Scanning..."

const { data:{ text } } =
await Tesseract.recognize(file,'eng')

document.getElementById("status")
.innerText="Scan selesai"

parse(text)

}

function parse(text){

let lines = text.split("\n")

lines.forEach(line => {

line = line.trim()

// cocokkan harga seperti 18.000 atau 18000
let match = line.match(/(.+?)\s+([\d\.]{3,})$/)

if(match){

let name = match[1].trim()

let price = match[2].replace(/\./g,'')

addItem(name, price)

}

})

}

function addItem(name,price){

let table=document
.getElementById("menu")

let row=table.insertRow()

row.innerHTML=`

<td>${name}</td>

<td>${price}</td>

<td>
<select class="person"></select>
</td>

`

updateSelect()

}

function calculate(){

results={}

people.forEach(p=>{

results[p.trim()]=0

})

let tengah=0

let rows=document
.querySelectorAll("#menu tr")

rows.forEach((r,i)=>{

if(i==0) return

let price=parseFloat(
r.cells[1].innerText
)

let person=r.cells[2]
.querySelector("select")
.value

if(person=="tengah")

tengah+=price

else

results[person]+=price

})

let share=tengah/people.length

people.forEach(p=>{

results[p]+=share

})

let txt="Split Bill\n\n"

for(let p in results){

txt+=p+" : Rp "+Math.round(results[p])+"\n"

}

document.getElementById("result")
.innerText=txt

}

function share(){

let text=document
.getElementById("result")
.innerText

let url="https://wa.me/?text="+
encodeURIComponent(text)

window.open(url)

}
