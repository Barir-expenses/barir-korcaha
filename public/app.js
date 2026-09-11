// Credentials (Apni Supabase URL & Anon Key yaha daalein)
const SUPABASE_URL = "https://gmsapmodgwhmsgmgdzfm.supabase.co";[cite: 6]
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtc2FwbW9kZ3dobXNnbWdkemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTEyMzAsImV4cCI6MjEwNDYyNzIzMH0.XJm5a28xV-wF9_y7F4q8JiS73Ui8rFIczUDb63WJ1RM";[cite: 6]

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);[cite: 6]

// State for editing
let editingExpenseId = null;[cite: 6]

document.addEventListener('DOMContentLoaded', () => {[cite: 6]
    document.getElementById('expense_date').valueAsDate = new Date();[cite: 6]
    
    // Default Values: Current Year & Current Month
    const yearInput = document.getElementById('pdfYear');[cite: 6]
    if (yearInput) yearInput.value = new Date().getFullYear();[cite: 6]

    const monthSelect = document.getElementById('pdfMonth');[cite: 6]
    if (monthSelect) monthSelect.value = new Date().getMonth() + 1;[cite: 6]

    loadExpenses();[cite: 6]
    loadExpenseSuggestions();[cite: 6]

    // 3-Line Menu Drawer Controls
    const drawer = document.getElementById('drawerMenu');[cite: 6]
    if (document.getElementById('menuToggle')) {[cite: 6]
        document.getElementById('menuToggle').addEventListener('click', () => drawer.classList.add('active'));[cite: 6]
    }
    if (document.getElementById('closeDrawer')) {[cite: 6]
        document.getElementById('closeDrawer').addEventListener('click', () => drawer.classList.remove('active'));[cite: 6]
    }

    // Toggle Monthly vs Yearly fields in Drawer
    const reportTypeSelect = document.getElementById('reportType');[cite: 6]
    if (reportTypeSelect) {[cite: 6]
        reportTypeSelect.addEventListener('change', handleReportTypeToggle);[cite: 6]
        handleReportTypeToggle(); // Initial setup on page load[cite: 6]
    }

    // Optional Filter Search Event Listener
    const searchInput = document.getElementById('searchInput');[cite: 6]
    if (searchInput) {[cite: 6]
        searchInput.addEventListener('input', () => loadExpenses());[cite: 6]
    }
});

// Toggle Month dropdown based on Monthly/Yearly selection
function handleReportTypeToggle() {[cite: 6]
    const reportType = document.getElementById('reportType').value;[cite: 6]
    const monthlyGroup = document.getElementById('monthlyGroup');[cite: 6]
    if (!monthlyGroup) return;[cite: 6]

    if (reportType === 'monthly') {[cite: 6]
        monthlyGroup.style.display = 'block';[cite: 6]
    } else {
        monthlyGroup.style.display = 'none';[cite: 6]
    }
}

// Expenses Fetch Logic (Recent 5 Records Only)
async function loadExpenses() {[cite: 6]
    try {
        let query = supabaseClient.from('expenses').select('*');[cite: 6]

        const searchInput = document.getElementById('searchInput');[cite: 6]
        if (searchInput && searchInput.value.trim() !== '') {[cite: 6]
            query = query.ilike('title', `%${searchInput.value.trim()}%`);[cite: 6]
        }

        const { data, error } = await query
            .order('expense_date', { ascending: false })[cite: 6]
            .limit(5);[cite: 6]

        if (error) throw error;[cite: 6]

        const tbody = document.getElementById('expenseList');[cite: 6]
        if (!tbody) return;[cite: 6]
        tbody.innerHTML = '';[cite: 6]

        if (data && data.length > 0) {[cite: 6]
            data.forEach(item => {[cite: 6]
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td class="amount-td">₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;[cite: 6]
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No records found.</td></tr>`;[cite: 6]
        }
    } catch (err) {
        console.error("Fetch Error:", err);[cite: 6]
    }
}

// Saved Expense Titles Datalist Suggestions
async function loadExpenseSuggestions() {[cite: 6]
    try {
        const { data, error } = await supabaseClient
            .from('expenses')[cite: 6]
            .select('title, amount');[cite: 6]

        if (error) throw error;[cite: 6]

        const datalist = document.getElementById('expenseSuggestions');[cite: 6]
        if (!datalist) return;[cite: 6]
        datalist.innerHTML = '';[cite: 6]

        if (data && data.length > 0) {[cite: 6]
            const categoryTotals = {};[cite: 6]
            data.forEach(item => {[cite: 6]
                const title = item.title.trim();[cite: 6]
                const amount = Number(item.amount) || 0;[cite: 6]
                categoryTotals[title] = (categoryTotals[title] || 0) + amount;[cite: 6]
            });

            Object.keys(categoryTotals).forEach(title => {[cite: 6]
                const totalFormatted = categoryTotals[title].toLocaleString('en-IN', { minimumFractionDigits: 2 });[cite: 6]
                const option = document.createElement('option');[cite: 6]
                option.value = title; [cite: 6]
                option.label = `${title} (Total: ₹${totalFormatted})`;[cite: 6]
                datalist.appendChild(option);[cite: 6]
            });
        }
    } catch (err) {
        console.error("Suggestions Fetch Error:", err);[cite: 6]
    }
}

// Expense Title input total spend badge indicator
const titleInput = document.getElementById('title');[cite: 6]
if (titleInput) {[cite: 6]
    titleInput.addEventListener('input', async (e) => {[cite: 6]
        const selectedTitle = e.target.value.trim();[cite: 6]
        const badge = document.getElementById('categorySpendBadge');[cite: 6]
        const amountSpan = document.getElementById('categorySpendAmount');[cite: 6]

        if (!badge || !amountSpan) return;[cite: 6]

        if (!selectedTitle) {[cite: 6]
            badge.style.display = 'none';[cite: 6]
            return;[cite: 6]
        }

        try {
            const { data, error } = await supabaseClient
                .from('expenses')[cite: 6]
                .select('amount')[cite: 6]
                .ilike('title', selectedTitle);[cite: 6]

            if (error) throw error;[cite: 6]

            if (data && data.length > 0) {[cite: 6]
                const total = data.reduce((sum, item) => sum + Number(item.amount), 0);[cite: 6]
                amountSpan.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;[cite: 6]
                badge.style.display = 'block';[cite: 6]
            } else {
                badge.style.display = 'none';[cite: 6]
            }
        } catch (err) {
            console.error("Category Spend Error:", err);[cite: 6]
        }
    });
}

// Save & Update Expense Logic
document.getElementById('expenseForm').addEventListener('submit', async (e) => {[cite: 6]
    e.preventDefault();[cite: 6]
    const amount = document.getElementById('amount').value;[cite: 6]
    const title = document.getElementById('title').value;[cite: 6]
    const expense_date = document.getElementById('expense_date').value;[cite: 6]

    if (!amount || !title || !expense_date) {[cite: 6]
        alert("Kripya saare fields bharein.");[cite: 6]
        return;[cite: 6]
    }

    try {
        if (editingExpenseId) {[cite: 6]
            const { error } = await supabaseClient
                .from('expenses')[cite: 6]
                .update({ amount: parseFloat(amount), title: title.trim(), expense_date })[cite: 6]
                .eq('id', editingExpenseId);[cite: 6]

            if (error) throw error;[cite: 6]
            editingExpenseId = null;[cite: 6]

            const submitBtn = document.querySelector('#expenseForm button[type="submit"]');[cite: 6]
            if (submitBtn) submitBtn.textContent = 'Save Expense';[cite: 6]
        } else {
            const { error } = await supabaseClient
                .from('expenses')[cite: 6]
                .insert([{ amount: parseFloat(amount), title: title.trim(), expense_date }]);[cite: 6]

            if (error) throw error;[cite: 6]
        }

        document.getElementById('amount').value = '';[cite: 6]
        document.getElementById('title').value = '';[cite: 6]
        const badge = document.getElementById('categorySpendBadge');[cite: 6]
        if (badge) badge.style.display = 'none';[cite: 6]
        
        loadExpenses();[cite: 6]
        loadExpenseSuggestions();[cite: 6]
    } catch (err) {
        alert(`Error: ${err.message}`);[cite: 6]
    }
});

// ADVANCED & PROFESSIONAL PDF GENERATOR
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {[cite: 6]
    const reportType = document.getElementById('reportType').value;[cite: 6]
    const month = document.getElementById('pdfMonth').value;[cite: 6]
    const year = document.getElementById('pdfYear').value;[cite: 6]

    if (!year) {[cite: 6]
        alert('Kripya Year enter karein (e.g. 2026).');[cite: 6]
        return;[cite: 6]
    }

    try {
        let query = supabaseClient.from('expenses').select('*');[cite: 6]

        if (reportType === 'monthly' && month) {[cite: 6]
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;[cite: 6]
            const lastDay = new Date(year, month, 0).getDate();[cite: 6]
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;[cite: 6]
            query = query.gte('expense_date', startDate).lte('expense_date', endDate);[cite: 6]
        } else {
            query = query.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);[cite: 6]
        }

        const { data, error } = await query.order('expense_date', { ascending: true });[cite: 6]

        if (error) throw error;[cite: 6]
        if (!data || data.length === 0) {[cite: 6]
            alert(`Selected duration (${reportType === 'monthly' ? 'Month ' + month + ' ' : ''}${year}) ke liye koi data nahi milaa.`);[cite: 6]
            return;[cite: 6]
        }

        const { jsPDF } = window.jspdf;[cite: 6]
        const doc = new jsPDF({ unit: 'mm', format: 'a4' });

        const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];[cite: 6]
        const periodText = reportType === 'monthly' ? `${monthNames[month]} ${year}` : `Full Year ${year}`;[cite: 6]

        // ----------------- 1. PREMIUM HEADER -----------------
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 38, 'F');

        doc.setFillColor(16, 185, 129); 
        doc.rect(0, 38, 210, 2, 'F');

        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("barir korcha", 14, 20);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("FINANCIAL STATEMENT & EXPENSE SUMMARY", 14, 28);

        // Status Badge
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(145, 10, 51, 16, 3, 3, 'F');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(52, 211, 153);
        doc.text("VERIFIED STATEMENT", 149, 20);

        // ----------------- 2. METRICS CARDS -----------------
        let totalAmount = 0;[cite: 6]
        const categoryTotals = {};[cite: 6]

        const rows = data.map((item, idx) => {[cite: 6]
            const itemAmt = Number(item.amount);[cite: 6]
            totalAmount += itemAmt;[cite: 6]

            const cleanTitle = item.title.trim();[cite: 6]
            categoryTotals[cleanTitle] = (categoryTotals[cleanTitle] || 0) + itemAmt;[cite: 6]

            return [
                String(idx + 1).padStart(2, '0'), 
                item.expense_date, 
                item.title, 
                `INR ${itemAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`[cite: 6]
            ];
        });

        // Box 1: Period
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 46, 58, 22, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("STATEMENT PERIOD", 18, 54);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(periodText, 18, 62);

        // Box 2: Total Items
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(76, 46, 58, 22, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("TOTAL TRANSACTIONS", 80, 54);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`${data.length} Records`, 80, 62);

        // Box 3: Total Spent
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(138, 46, 58, 22, 3, 3, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("TOTAL AMOUNT SPENT", 142, 54);
        doc.setFontSize(11);
        doc.setTextColor(185, 28, 28);
        doc.text(`INR ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 142, 62);

        // ----------------- 3. CATEGORY SUMMARY TABLE -----------------
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Category Breakdown", 14, 78);

        const categoryRows = Object.keys(categoryTotals).map((title, i) => [
            String(i + 1).padStart(2, '0'),
            title,
            `INR ${categoryTotals[title].toLocaleString('en-IN', { minimumFractionDigits: 2 })}`[cite: 6]
        ]);

        doc.autoTable({[cite: 6]
            startY: 82,
            head: [['#', 'Category Name', 'Total Amount']],
            body: categoryRows,
            theme: 'striped',
            headStyles: { 
                fillColor: [79, 70, 229], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5
            },
            bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
            alternateRowStyles: { fillColor: [245, 247, 250] },
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 115 },
                2: { cellWidth: 55, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            margin: { left: 14, right: 14 }[cite: 6]
        });

        // ----------------- 4. ALL TRANSACTIONS TABLE -----------------
        const nextY = doc.lastAutoTable.finalY + 10;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Transaction History", 14, nextY);

        doc.autoTable({[cite: 6]
            startY: nextY + 4,
            head: [['#', 'Date', 'Expense Details', 'Amount']],
            body: rows,
            theme: 'striped',
            headStyles: { 
                fillColor: [15, 23, 42], 
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8.5
            },
            bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
            alternateRowStyles: { fillColor: [248, 250, 252] },[cite: 6]
            columnStyles: {
                0: { cellWidth: 12, halign: 'center' },
                1: { cellWidth: 32 },
                2: { cellWidth: 91 },
                3: { cellWidth: 47, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            margin: { left: 14, right: 14 }[cite: 6]
        });

        // ----------------- 5. FOOTER -----------------
        const pageCount = doc.internal.getNumberOfPages();[cite: 6]
        for (let i = 1; i <= pageCount; i++) {[cite: 6]
            doc.setPage(i);[cite: 6]
            
            doc.setDrawColor(226, 232, 240);
            doc.line(14, 280, 196, 280);

            doc.setFontSize(8);[cite: 6]
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);[cite: 6]
            doc.text(`Generated automatically via barir korcha`, 14, 286);
            doc.text(`Page ${i} of ${pageCount}`, 182, 286);
        }

        const fileName = reportType === 'monthly' ? `Barir_Korcha_${monthNames[month]}_${year}.pdf` : `Barir_Korcha_Year_${year}.pdf`;[cite: 6]
        doc.save(fileName);[cite: 6]

        const drawer = document.getElementById('drawerMenu');[cite: 6]
        if (drawer) drawer.classList.remove('active');[cite: 6]

    } catch (err) {
        alert(`PDF Error: ${err.message}`);[cite: 6]
    }
});
