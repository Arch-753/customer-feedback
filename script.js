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
const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = error => reject(error);
});

if(form){
form.onsubmit=async function(e){
e.preventDefault();

    let imageFiles = imageUpload ? [...imageUpload.files].slice(0, 3) : [];
    let imageBase64Strings = [];
    
    try {
        for(let file of imageFiles) {
            let b64 = await toBase64(file);
            imageBase64Strings.push(b64);
        }
    } catch(e) {
        console.error("Image conversion failed", e);
    }

    let newReview = {
        firmName:document.getElementById("firmName")?.value || "",
        customerName:document.getElementById("customerName").value,
        review:document.getElementById("review").value,
        rating:parseInt(ratingInput?.value || 0),
        product:selectedProduct?.value || "",
        visits:[new Date().toISOString()],
        images: imageBase64Strings
    };

try {
    await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newReview)
    });
    form.style.display="none";
    document.getElementById("thankYouScreen")?.classList.remove("hidden");
} catch(err) {
    console.error("Error submitting review", err);
    alert("Failed to submit review. Is the server running?");
}

};
}

/* =========================
   ADMIN
========================= */

if(document.getElementById("loginBox")){

    let loginBox = document.getElementById("loginBox");
    let forgotBox = document.getElementById("forgotBox");
    let adminForm = document.getElementById("adminForm");
    let forgotBtn = document.getElementById("forgotBtn");
    
    let adminTitle = document.getElementById("adminTitle");
    let adminSubtitle = document.getElementById("adminSubtitle");
    let adminSubmitBtn = document.getElementById("adminSubmitBtn");

    let isCreating = false;

    // Check if admin is setup
    (async function checkAdminPass() {
        try {
            let res = await fetch('/api/admin/check');
            let data = await res.json();
            
            if(!data.exists) {
                // Mode: Creation
                isCreating = true;
                adminTitle.innerText = "Setup Admin Account";
                adminSubtitle.innerText = "Create the master phone and password";
                adminSubmitBtn.innerText = "Create Account";
                forgotBtn.classList.add("hidden");
            } else {
                // Mode: Login
                isCreating = false;
                forgotBtn.classList.remove("hidden");
            }
        } catch(err) {
            console.error("Could not check admin status", err);
        }
    })();

    // Handle Login or Create Account Submission
    adminForm.onsubmit = async function(e) {
        e.preventDefault();
        
        let phone = document.getElementById("adminPhone").value;
        let pass = document.getElementById("adminPassword").value;

        if(!phone || !pass) return alert("Please fill all fields");

        try {
            if(isCreating) {
                // Create API call
                let res = await fetch('/api/admin/create', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone, password: pass })
                });
                let data = await res.json();
                
                if(res.status === 201) {
                    alert("Account Created successfully! You can now log in.");
                    window.location.reload();
                } else {
                    alert(data.message);
                }
            } else {
                // Login API call
                let res = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ phoneNumber: phone, password: pass })
                });
                let data = await res.json();
                
                if(data.success){
                    window.location.href="dashboard.html";
                } else {
                    alert(data.message);
                }
            }
        } catch(err) {
            alert("Network error. Ensure the server is running.");
        }
    };

    // Forgot Password Box Toggle
    window.openForgotBox = function() {
        loginBox.classList.add("hidden");
        forgotBox.classList.remove("hidden");
    };

    window.closeForgotBox = function() {
        forgotBox.classList.add("hidden");
        loginBox.classList.remove("hidden");
    };

    // OTP Flow
    window.requestOTP = async function() {
        let phone = document.getElementById("forgotPhone").value;
        if(!phone) return alert("Enter your registered phone number");

        try {
            let res = await fetch('/api/admin/forgot', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone })
            });
            let data = await res.json();

            if(res.status === 200 || data.success) {
                alert(data.message);
                document.getElementById("otpRequestSection").classList.add("hidden");
                document.getElementById("otpVerifySection").classList.remove("hidden");
            } else {
                alert(data.message);
            }
        } catch(err) {
            alert("Error sending OTP");
        }
    };

    window.verifyResetOTP = async function() {
        let phone = document.getElementById("forgotPhone").value;
        let otp = document.getElementById("otpCode").value;
        let newPass = document.getElementById("newPassword").value;

        if(!otp || !newPass) return alert("Fill in the OTP and new password");

        try {
            let res = await fetch('/api/admin/reset', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone, otp: otp, newPassword: newPass })
            });
            let data = await res.json();

            if(res.status === 200 && data.success) {
                alert("Password reset successfully! You can now login.");
                window.location.reload();
            } else {
                alert(data.message);
            }
        } catch(err) {
            alert("Error verifying OTP");
        }
    };

}

/* =====================
   DASHBOARD
===================== */

let chart = null;
let selectedSort = null;
let selectedProductFilter = null;
let globalReviews = []; // Track reviews fetched from DB

if(document.getElementById("colUnattended")){
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

fetchAndRenderReviews();
}

async function fetchAndRenderReviews() {
    try {
        let res = await fetch('/api/reviews');
        globalReviews = await res.json();
        renderReviews();
    } catch(err) {
        console.error("Failed to fetch reviews", err);
    }
}

/* RENDER REVIEWS */

function renderReviews(){

    let colUnattended = document.getElementById("colUnattended");
    let colSeen = document.getElementById("colSeen");
    let colFinalized = document.getElementById("colFinalized");
    
    if(!colUnattended || !colSeen || !colFinalized) return;
    
    colUnattended.innerHTML = "";
    colSeen.innerHTML = "";
    colFinalized.innerHTML = "";
    
    let total = 0;
    let count = 0;
    
    let filtered = [...globalReviews];
    
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
    
    filtered.forEach((r)=>{
    
        let bg="glass";
        
        /* 1 & 2 STAR ALWAYS RED */
        if(r.rating <= 2){
            bg="bg-red-900/40 border border-red-500/50 backdrop-blur-xl";
        } else if(r.seen){
            bg="bg-emerald-900/20 border border-emerald-500/30 backdrop-blur-xl";
        } else {
            bg="glass";
        }
        
        total += Number(r.rating) || 0;
        count++;
        
        let rId = r._id;
        
        let headerHTML = `
            <div onclick="showGraph('${rId}')" class="cursor-pointer">
                <p class="font-bold text-white text-lg drop-shadow">${r.firmName||""}</p>
                <p class="font-bold text-sm text-indigo-200">${r.customerName}</p>
                <p class="text-xs text-indigo-300 mt-1">Product: ${r.product||""}</p>
                <p class="text-yellow-400 font-bold mt-2 tracking-widest drop-shadow">${'★'.repeat(r.rating)}${'☆'.repeat(5-r.rating)}</p>
                <p class="mt-3 text-slate-100 italic border-l-2 border-indigo-400 pl-3">"${r.review}"</p>
                
                ${r.images && r.images.length > 0 ? `
                <div class="mt-3 flex flex-wrap gap-2">
                    ${r.images.map(img => `<img src="${img}" class="w-16 h-16 object-cover rounded-lg border border-white/10 shadow-sm">`).join('')}
                </div>
                ` : ''}
            </div>
        `;
        
        let buttonsHTML = "";
        let appendedBlock = "";
        
        if(!r.seen) {
            // UNATTENDED (Column 1)
            buttonsHTML = `
                <div class="mt-4 flex flex-wrap gap-3">
                    <button onclick="markSeen('${rId}');event.stopPropagation();" class="text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:-translate-y-0.5 transition">Mark as Seen</button>
                    <button onclick="deleteReview('${rId}');event.stopPropagation();" class="text-sm bg-gradient-to-r from-red-500 to-rose-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:-translate-y-0.5 transition">Delete</button>
                </div>
            `;
            colUnattended.innerHTML += `<div class="${bg} p-4 rounded shadow-sm hover:shadow transition">${headerHTML}${buttonsHTML}</div>`;
        } 
        else if(r.seen && (!r.adminReply || r.adminReply.trim() === "")) {
            // SEEN BUT NOT REPLIED (Column 2)
            buttonsHTML = `
                <div class="mt-4 space-x-2">
                    <button onclick="shareReview('${rId}');event.stopPropagation();" class="text-sm border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/10 font-bold transition">Share</button>
                </div>
            `;
            appendedBlock = `
                <div class="mt-4 border-t border-white/20 pt-3">
                    <textarea id="replyInput_${rId}" class="w-full text-sm p-3 rounded-lg mb-3 glass-input font-bold" placeholder="Write reply to customer..."></textarea>
                    <button onclick="submitAdminReply('${rId}');event.stopPropagation();" class="w-full text-sm bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold px-4 py-2 rounded-lg shadow-lg hover:-translate-y-0.5 transition">Submit Reply</button>
                </div>
            `;
            colSeen.innerHTML += `<div class="${bg} p-4 rounded shadow-sm hover:shadow transition">${headerHTML}${buttonsHTML}${appendedBlock}</div>`;
        }
        else if(r.seen && r.adminReply) {
            // FINALIZED (Column 3)
            buttonsHTML = `
                <div class="mt-4 space-x-2">
                    <button onclick="shareReview('${rId}');event.stopPropagation();" class="text-sm border border-white/20 text-white px-4 py-2 rounded-lg hover:bg-white/10 font-bold transition">Share</button>
                </div>
            `;
            appendedBlock = `
                <div class="mt-4 bg-black/20 p-3 rounded-lg border border-white/10">
                    <p class="text-xs font-bold text-indigo-300 mb-1">Your Reply:</p>
                    <p class="text-sm text-indigo-50">"${r.adminReply}"</p>
                </div>
            `;
            colFinalized.innerHTML += `<div class="${bg} p-4 rounded shadow-sm hover:shadow transition">${headerHTML}${appendedBlock}${buttonsHTML}</div>`;
        }
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

window.submitAdminReply = async function(id) {
    let input = document.getElementById("replyInput_" + id);
    if(!input || !input.value.trim()) return alert("Reply cannot be empty!");
    
    try {
        await fetch('/api/reviews/' + id + '/reply', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminReply: input.value.trim() })
        });
        fetchAndRenderReviews();
    } catch(err) {
        alert("Failed to save reply.");
    }
};


/* MARK AS SEEN */

async function markSeen(id){
    try {
        await fetch('/api/reviews/' + id + '/seen', { method: 'PUT' });
        await fetchAndRenderReviews();
    } catch(err){
        console.error(err);
    }
}

/* DELETE */

async function deleteReview(id){
    try {
        if(!confirm("Are you sure you want to delete this review?")) return;
        await fetch('/api/reviews/' + id, { method: 'DELETE' });
        await fetchAndRenderReviews();
    } catch (err){
        console.error(err);
    }
}

/* SHARE */

function shareReview(id){
let review = globalReviews.find(r => r._id === id);
if(!review) return;

navigator.clipboard.writeText(
(review.customerName || "") + " - " + (review.review || "")
);
alert("Copied to clipboard");
}

/* GRAPH */

function showGraph(id){

let modal = document.getElementById("graphModal");
let canvas = document.getElementById("visitChart");

if(!modal || !canvas) return;

let review = globalReviews.find(r => r._id === id);
if(!review) return;

modal.classList.remove("hidden");

// Find all reviews submitted by the same firm (or customer if firm is empty)
let matchingReviews = globalReviews.filter(r => {
    if (review.firmName) {
        return (r.firmName || "").toLowerCase().trim() === review.firmName.toLowerCase().trim();
    } else {
        return (r.customerName || "").toLowerCase().trim() === (review.customerName || "").toLowerCase().trim();
    }
});

// Collect all visit timestamps from the matching reviews
let allVisits = [];
matchingReviews.forEach(r => {
    if (r.visits && r.visits.length > 0) {
        allVisits.push(...r.visits);
    } else if (r.createdAt) {
        allVisits.push(r.createdAt); // Fallback to creation date
    }
});

// Sort timestamps chronologically
allVisits.sort((a, b) => new Date(a) - new Date(b));

let ctx = canvas.getContext("2d");

if(chart) chart.destroy();

/* IF NO DATA */
if(allVisits.length === 0){
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
labels: allVisits.map(v=>new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })),
datasets:[{
data: allVisits.map((_,i)=>i+1),
borderColor:"#0284c7",
backgroundColor:"rgba(2,132,199,0.15)",
fill:true,
tension:0.3
}]
},
options:{
plugins:{legend:{display:false}},
scales:{
    y:{
        beginAtZero:true,
        ticks: { stepSize: 1 } // Ensure whole numbers on the Y axis for visits
    }
}
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

/* =====================
   ORDER MANAGEMENT (ADMIN)
===================== */

let adminSelectedOrderId = null;

window.openOrderManager = function() {
    document.getElementById("orderManagerOverlay").classList.remove("hidden");
    fetchAdminOrders();
};

window.closeOrderManager = function() {
    document.getElementById("orderManagerOverlay").classList.add("hidden");
};

window.openAddOrderModal = function() {
    document.getElementById("addOrderModal").classList.remove("hidden");
};

window.closeAddOrderModal = function() {
    document.getElementById("addOrderModal").classList.add("hidden");
    document.getElementById("addOrderForm").reset();
};

if(document.getElementById("addOrderForm")) {
    document.getElementById("addOrderForm").onsubmit = async function(e) {
        e.preventDefault();
        let firm = document.getElementById("newFirmName").value;
        let cust = document.getElementById("newCustName").value;
        let addr = document.getElementById("newAddress").value;

        try {
            let resp = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ firmName: firm, customerName: cust, address: addr })
            });
            
            if(!resp.ok) {
                let text = await resp.text();
                throw new Error("Server error: " + resp.status + " " + text);
            }
            
            closeAddOrderModal();
            fetchAdminOrders();
        } catch(err) {
            console.error(err);
            alert("Error adding customer order! Have you restarted the server backend?");
        }
    };
}

async function fetchAdminOrders() {
    let completedListEl = document.getElementById("completedOrdersList");
    let activeListEl = document.getElementById("activeOrdersList");
    if(!completedListEl || !activeListEl) return;
    
    try {
        let res = await fetch('/api/orders');
        let orders = await res.json();
        
        let completedHTML = "";
        let activeHTML = "";
        
        let completedOrders = orders.filter(o => o.statusNode === -1 || o.statusNode === 4);
        let activeOrders = orders.filter(o => o.statusNode >= 0 && o.statusNode < 4);

        if(completedOrders.length === 0) {
            completedHTML = "<p class='text-slate-500 col-span-full'>No completed customers yet.</p>";
        } else {
            completedOrders.forEach(o => {
                completedHTML += `
                <div class="p-4 bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow transition flex justify-between items-center group">
                    <div>
                        <p class="font-bold text-sky-800">${o.firmName}</p>
                        <p class="text-sm text-slate-600 mb-1">${o.customerName}</p>
                        ${o.statusNode === 4 ? `<span class="text-xs bg-green-100 text-green-700 font-bold px-2 py-1 rounded">✅ Review Received</span>` : `<span class="text-xs bg-slate-100 text-slate-500 px-2 py-1 rounded">Idle</span>`}
                    </div>
                    <div class="flex space-x-2">
                        <button onclick="deleteCustomer('${o._id}')" class="w-8 h-8 flex items-center justify-center bg-red-50 text-red-500 hover:bg-red-500 hover:text-white rounded transition shadow-sm" title="Delete Customer">
                            🗑️
                        </button>
                        <button onclick="startOrder('${o._id}')" class="w-10 h-10 flex items-center justify-center bg-sky-100 text-sky-600 hover:bg-sky-500 hover:text-white rounded font-bold text-xl transition shadow-sm" title="Start New Order">
                            ➕
                        </button>
                    </div>
                </div>
                `;
            });
        }

        if(activeOrders.length === 0) {
            activeHTML = "<p class='text-slate-500'>No active orders at the moment.</p>";
        } else {
            activeOrders.forEach(o => {
                activeHTML += `
                <div class="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-sky-300 transition cursor-pointer" onclick="selectOrderToTrack('${o._id}', '${o.orderId}', ${o.statusNode || 0}, ${o.isPaid || false})">
                    <div>
                        <p class="font-bold text-sky-900">${o.firmName}</p>
                        <p class="text-xs text-slate-500 font-mono mt-1">ID: #${o.orderId}</p>
                    </div>
                    <div class="flex items-center space-x-3">
                        ${o.isPaid ? `<span class="bg-emerald-100 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-tighter">Paid</span>` : ``}
                        <div class="flex flex-col items-end">
                            <span class="text-[10px] text-indigo-300 font-bold uppercase tracking-tighter">Visits</span>
                            <span class="text-white font-mono text-xs">${(o.visits || []).length}</span>
                        </div>
                        <div class="text-indigo-400 text-xl font-bold ml-2">➔</div>
                    </div>
                </div>
                `;
            });
        }
        
        completedListEl.innerHTML = completedHTML;
        activeListEl.innerHTML = activeHTML;
    } catch(err) {
        console.error(err);
    }
}

let adminCurrentIsPaid = false;

window.selectOrderToTrack = function(databaseId, orderIdLabel, statusNode, isPaid) {
    adminSelectedOrderId = databaseId; 
    adminCurrentIsPaid = isPaid;

    // Show the bottom box flowchart
    document.getElementById("emptyTrackerBox").classList.add("hidden");
    document.getElementById("adminTrackerBox").classList.remove("hidden");
    document.getElementById("adminTrackerId").innerText = orderIdLabel;
    
    // Update Pay Button UI
    updatePaymentBtnUI();

    renderAdminTracker(statusNode);
};

window.updatePaymentBtnUI = function() {
    let btn = document.getElementById("adminPaymentToggleBtn");
    if(!btn) return;
    if(adminCurrentIsPaid) {
        btn.innerText = "Received";
        btn.className = "w-24 px-3 py-1 text-sm font-bold rounded shadow-sm transition bg-green-500 text-white hover:bg-green-600";
    } else {
        btn.innerText = "Pending";
        btn.className = "w-24 px-3 py-1 text-sm font-bold rounded shadow-sm transition bg-amber-100 text-amber-700 hover:bg-amber-200";
    }
};

window.togglePaymentStatus = async function() {
    if(!adminSelectedOrderId) return;
    adminCurrentIsPaid = !adminCurrentIsPaid;
    updatePaymentBtnUI(); // instant optimisitic UI
    try {
        await fetch('/api/orders/' + adminSelectedOrderId + '/payment', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ isPaid: adminCurrentIsPaid })
        });
        fetchAdminOrders();
    } catch(err) {
        alert("Failed to save payment status.");
    }
};

window.renderAdminTracker = function(status) {
    // Reset all nodes
    for(let i=0; i<=4; i++) {
        let n = document.getElementById("admin-node-"+i);
        if(n) n.classList.remove("active");
    }
    // Set active upto current
    for(let i=0; i<=status; i++) {
        let n = document.getElementById("admin-node-"+i);
        if(n) n.classList.add("active");
    }
    // Progress width
    let prog = document.getElementById("adminTrackerProgress");
    if(prog) {
        let progressPercent = (status / 4) * 100;
        prog.style.width = `calc(${progressPercent}% - 80px)`;
    }
};

window.updateOrderStatus = async function(nodeIndex) {
    if(!adminSelectedOrderId) return;
    
    // UI update instantly for feel
    renderAdminTracker(nodeIndex);

    try {
        await fetch('/api/orders/' + adminSelectedOrderId + '/status', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ statusNode: nodeIndex })
        });
        
        // Refresh underlying list
        await fetchAdminOrders(); 
        
        // If order completed (node 4), it moves to upper box. Hide flowchart here.
        if (nodeIndex === 4) {
            document.getElementById("adminTrackerBox").classList.add("hidden");
            document.getElementById("emptyTrackerBox").classList.remove("hidden");
            adminSelectedOrderId = null;
        }
        
    } catch(err) {
        alert("Failed to update status on server.");
    }
};

window.deleteCustomer = async function(id) {
    if(!confirm("Are you sure you want to permanently delete this customer from MongoDB?")) return;
    try {
        await fetch('/api/orders/' + id, { method: 'DELETE' });
        fetchAdminOrders();
    } catch(err) {
        alert("Failed to delete customer");
    }
};

window.startOrder = async function(id) {
    if(!confirm("Start a new order tracking for this customer?")) return;
    try {
        await fetch('/api/orders/' + id + '/start', { method: 'PUT' });
        fetchAdminOrders();
    } catch(err) {
        alert("Failed to start new order");
    }
};

});
