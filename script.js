document.addEventListener("DOMContentLoaded", function(){

/* =========================
   REVIEW PAGE
========================= */

let stars = document.querySelectorAll(".star");
let ratingInput = document.getElementById("rating");
let productButtons = document.querySelectorAll(".product-btn");
let selectedProduct = document.getElementById("selectedProduct");
let form = document.getElementById("feedbackForm");
let imageUpload = document.getElementById("imageUpload");
let preview = document.getElementById("imagePreview");

if(stars.length && ratingInput){
stars.forEach(star=>{
star.onclick=function(){
ratingInput.value=this.dataset.value;

stars.forEach(s=>{
s.classList.remove("text-yellow-400");
s.classList.add("text-red-500");
});

for(let i=0;i<this.dataset.value;i++){
stars[i].classList.remove("text-red-500");
stars[i].classList.add("text-yellow-400");
}
};
});
}

if(productButtons.length && selectedProduct){
productButtons.forEach(btn=>{
btn.onclick=function(){
productButtons.forEach(b=>b.classList.remove("active"));
this.classList.add("active");
selectedProduct.value=this.innerText;
};
});
}

if(imageUpload && preview){
imageUpload.addEventListener("change",function(){
preview.innerHTML="";
let files=[...this.files].slice(0,3);

files.forEach(file=>{
let reader=new FileReader();
reader.onload=function(e){
let img=document.createElement("img");
img.src=e.target.result;
img.className="w-16 h-16 object-cover rounded";
preview.appendChild(img);
};
reader.readAsDataURL(file);
});
});
}

if(form){
form.onsubmit=function(e){
e.preventDefault();

let data=JSON.parse(localStorage.getItem("reviews"))||[];

data.push({
firmName:document.getElementById("firmName")?.value || "",
customerName:document.getElementById("customerName").value,
review:document.getElementById("review").value,
rating:parseInt(ratingInput?.value || 0),
product:selectedProduct?.value || "",
seen:false,
visits:[new Date().toISOString()]
});

localStorage.setItem("reviews",JSON.stringify(data));

form.style.display="none";
document.getElementById("thankYouScreen")?.classList.remove("hidden");
};
}

/* =========================
   ADMIN
========================= */

if(document.getElementById("adminPassword")){

let forgotBtn = document.getElementById("forgotBtn");

if(localStorage.getItem("adminPass")){
forgotBtn?.classList.remove("hidden");
}

window.login=function(){

let stored = localStorage.getItem("adminPass");

if(!stored){
let newPass = prompt("Create Password");
if(newPass){
localStorage.setItem("adminPass",newPass);
alert("Password Created");
}
return;
}

let entered = document.getElementById("adminPassword").value;

if(entered === stored){
window.location.href="dashboard.html";
}else{
alert("Incorrect Password");
}
};

window.forgotPassword=function(){
let otp=Math.floor(1000+Math.random()*9000);
alert("OTP Sent: "+otp);
let entered=prompt("Enter OTP");
if(entered==otp){
window.location.href="dashboard.html";
}
};

}
/* =====================
   DASHBOARD
===================== */

let chart = null;
let selectedSort = null;
let selectedProductFilter = null;

if(document.getElementById("reviewsContainer")){
    initializeDashboard();
}

function initializeDashboard(){

let filterBtn = document.getElementById("filterBtn");
let filterMenu = document.getElementById("filterMenu");
let applyBtn = document.getElementById("applyFilter");

/* FILTER TOGGLE */
if(filterBtn && filterMenu){
filterBtn.addEventListener("click", function(e){
    e.stopPropagation();
    filterMenu.classList.toggle("hidden");
});

document.addEventListener("click", function(e){
    if(!filterMenu.contains(e.target) && e.target !== filterBtn){
        filterMenu.classList.add("hidden");
    }
});
}

/* SORT OPTIONS */
document.querySelectorAll(".sort-option").forEach(option=>{
option.addEventListener("click", function(){
document.querySelectorAll(".sort-option")
.forEach(o=>o.classList.remove("selected"));
this.classList.add("selected");
selectedSort = this.innerText;
});
});

/* PRODUCT FILTER */
document.querySelectorAll(".product-filter").forEach(option=>{
option.addEventListener("click", function(){
document.querySelectorAll(".product-filter")
.forEach(o=>o.classList.remove("selected"));
this.classList.add("selected");
selectedProductFilter = this.innerText;
});
});

/* APPLY FILTER */
if(applyBtn){
applyBtn.addEventListener("click", function(){
renderReviews();
filterMenu.classList.add("hidden");
});
}

renderReviews();
}

/* RENDER REVIEWS */

function renderReviews(){

let container = document.getElementById("reviewsContainer");
if(!container) return;

container.innerHTML = "";

let total = 0;
let count = 0;

let data = JSON.parse(localStorage.getItem("reviews")) || [];
let filtered = [...data];

/* APPLY FILTER */
if(selectedProductFilter){
filtered = filtered.filter(r=>r.product===selectedProductFilter);
}

if(selectedSort==="Ascending"){
filtered.sort((a,b)=>a.rating-b.rating);
}
if(selectedSort==="Descending"){
filtered.sort((a,b)=>b.rating-a.rating);
}

filtered.forEach((r,index)=>{

let bg="bg-white";

/* 1 & 2 STAR ALWAYS RED */
if(r.rating <= 2){
    bg="bg-red-100 border border-red-400";
}

/* MARK AS SEEN ALWAYS GREEN */
if(r.seen){
    bg="bg-green-100 border border-green-400";
}

total += Number(r.rating) || 0;
count++;

container.innerHTML+=`
<div class="${bg} p-4 rounded shadow review-card">

<div onclick="showGraph(${index})" class="cursor-pointer">
<p class="font-bold">${r.firmName||""}</p>
<p class="font-bold">${r.customerName}</p>
<p>Product: ${r.product||""}</p>
<p>Rating: ${r.rating} ⭐</p>
<p class="mt-2">${r.review}</p>
</div>

<div class="mt-3 space-x-2">
<button onclick="markSeen(${index});event.stopPropagation();"
class="bg-sky-500 text-white px-3 py-1 rounded">
Mark as Seen
</button>

<button onclick="deleteReview(${index});event.stopPropagation();"
class="bg-red-400 text-white px-3 py-1 rounded">
Delete
</button>

<button onclick="shareReview(${index});event.stopPropagation();"
class="bg-blue-400 text-white px-3 py-1 rounded">
Share
</button>
</div>

</div>`;
});

let avgElement = document.getElementById("avgRating");

if(avgElement){
if(count === 0){
    avgElement.innerText = "No Reviews Found";
} else {
    avgElement.innerText = (total / count).toFixed(1) + " ⭐";
}
}

}


/* MARK AS SEEN */

function markSeen(index){
let data = JSON.parse(localStorage.getItem("reviews")) || [];
if(!data[index]) return;

data[index].seen = true;
localStorage.setItem("reviews", JSON.stringify(data));
renderReviews();
}

/* DELETE */

function deleteReview(index){
let data = JSON.parse(localStorage.getItem("reviews")) || [];
if(!data[index]) return;

data.splice(index,1);
localStorage.setItem("reviews", JSON.stringify(data));
renderReviews();
}

/* SHARE */

function shareReview(index){
let data = JSON.parse(localStorage.getItem("reviews")) || [];
if(!data[index]) return;

navigator.clipboard.writeText(
(data[index].customerName || "") + " - " + (data[index].review || "")
);
alert("Copied to clipboard");
}

/* GRAPH */

function showGraph(index){

let modal = document.getElementById("graphModal");
let canvas = document.getElementById("visitChart");

if(!modal || !canvas) return;

let data = JSON.parse(localStorage.getItem("reviews")) || [];
if(!data[index]) return;

modal.classList.remove("hidden");

let visits = data[index].visits || [];

let ctx = canvas.getContext("2d");

if(chart) chart.destroy();

/* IF NO DATA */
if(visits.length === 0){
    chart = new Chart(ctx,{
        type:"line",
        data:{
            labels:["No past data found"],
            datasets:[{
                data:[0],
                borderColor:"#0284c7"
            }]
        },
        options:{
            plugins:{legend:{display:false}},
            scales:{y:{beginAtZero:true}}
        }
    });
    return;
}

/* NORMAL GRAPH */
chart = new Chart(ctx,{
type:"line",
data:{
labels: visits.map(v=>new Date(v).toLocaleTimeString()),
datasets:[{
data: visits.map((_,i)=>i+1),
borderColor:"#0284c7",
backgroundColor:"rgba(2,132,199,0.15)",
fill:true,
tension:0.3
}]
},
options:{
plugins:{legend:{display:false}},
scales:{y:{beginAtZero:true}}
}
});
}

/* CLOSE GRAPH */

function closeGraph(){
let modal = document.getElementById("graphModal");
if(modal){
modal.classList.add("hidden");
}
}
// Expose functions globally
window.markSeen = markSeen;
window.deleteReview = deleteReview;
window.shareReview = shareReview;
window.showGraph = showGraph;
window.closeGraph = closeGraph;

});
