// Credentials (Apni Supabase URL & Anon Key yaha daalein)
const SUPABASE_URL = "https://gmsapmodgwhmsgmgdzfm.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtc2FwbW9kZ3dobXNnbWdkemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTEyMzAsImV4cCI6MjEwNDYyNzIzMH0.XJm5a28xV-wF9_y7F4q8JiS73Ui8rFIczUDb63WJ1RM";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// State for editing
let editingExpenseId = null;

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('expense_date').valueAsDate = new Date();
    
    // Default Values: Current Year & Current Month
    const yearInput = document.getElementById('pdfYear');
    if (yearInput) yearInput.value = new Date().getFullYear();

    const monthSelect = document.getElementById('pdfMonth');
    if (monthSelect) monthSelect.value = new Date().getMonth() + 1;

    loadExpenses();
    loadExpenseSuggestions();

    // 3-Line Menu Drawer Controls
    const drawer = document.getElementById('drawerMenu');
    if (document.getElementById('menuToggle')) {
        document.getElementById('menuToggle').addEventListener('click', () => drawer.classList.add('active'));
    }
    if (document.getElementById('closeDrawer')) {
        document.getElementById('closeDrawer').addEventListener('click', () => drawer.classList.remove('active'));
    }

    // Toggle Monthly vs Yearly fields in Drawer
    const reportTypeSelect = document.getElementById('reportType');
    if (reportTypeSelect) {
        reportTypeSelect.addEventListener('change', handleReportTypeToggle);
        handleReportTypeToggle(); // Initial setup on page load
    }

    // Optional Filter Search Event Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', () => loadExpenses());
    }
});

// Toggle Month dropdown based on Monthly/Yearly selection
function handleReportTypeToggle() {
    const reportType = document.getElementById('reportType').value;
    const monthlyGroup = document.getElementById('monthlyGroup');
    if (!monthlyGroup) return;

    if (reportType === 'monthly') {
        monthlyGroup.style.display = 'block';
    } else {
        monthlyGroup.style.display = 'none';
    }
}

// Expenses Fetch Logic (Recent 5 Records Only)
async function loadExpenses() {
    try {
        let query = supabaseClient.from('expenses').select('*');

        const searchInput = document.getElementById('searchInput');
        if (searchInput && searchInput.value.trim() !== '') {
            query = query.ilike('title', `%${searchInput.value.trim()}%`);
        }

        const { data, error } = await query
            .order('expense_date', { ascending: false })
            .limit(5);

        if (error) throw error;

        const tbody = document.getElementById('expenseList');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td class="amount-td">₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No records found.</td></tr>`;
        }
    } catch (err) {
        console.error("Fetch Error:", err);
    }
}

// Saved Expense Titles Datalist Suggestions
async function loadExpenseSuggestions() {
    try {
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('title, amount');

        if (error) throw error;

        const datalist = document.getElementById('expenseSuggestions');
        if (!datalist) return;
        datalist.innerHTML = '';

        if (data && data.length > 0) {
            const categoryTotals = {};
            data.forEach(item => {
                const title = item.title.trim();
                const amount = Number(item.amount) || 0;
                categoryTotals[title] = (categoryTotals[title] || 0) + amount;
            });

            Object.keys(categoryTotals).forEach(title => {
                const totalFormatted = categoryTotals[title].toLocaleString('en-IN', { minimumFractionDigits: 2 });
                const option = document.createElement('option');
                option.value = title; 
                option.label = `${title} (Total: ₹${totalFormatted})`;
                datalist.appendChild(option);
            });
        }
    } catch (err) {
        console.error("Suggestions Fetch Error:", err);
    }
}

// Expense Title input total spend badge indicator
const titleInput = document.getElementById('title');
if (titleInput) {
    titleInput.addEventListener('input', async (e) => {
        const selectedTitle = e.target.value.trim();
        const badge = document.getElementById('categorySpendBadge');
        const amountSpan = document.getElementById('categorySpendAmount');

        if (!badge || !amountSpan) return;

        if (!selectedTitle) {
            badge.style.display = 'none';
            return;
        }

        try {
            const { data, error } = await supabaseClient
                .from('expenses')
                .select('amount')
                .ilike('title', selectedTitle);

            if (error) throw error;

            if (data && data.length > 0) {
                const total = data.reduce((sum, item) => sum + Number(item.amount), 0);
                amountSpan.textContent = `₹${total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
                badge.style.display = 'block';
            } else {
                badge.style.display = 'none';
            }
        } catch (err) {
            console.error("Category Spend Error:", err);
        }
    });
}

// Save & Update Expense Logic
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const title = document.getElementById('title').value;
    const expense_date = document.getElementById('expense_date').value;

    if (!amount || !title || !expense_date) {
        alert("Kripya saare fields bharein.");
        return;
    }

    try {
        if (editingExpenseId) {
            const { error } = await supabaseClient
                .from('expenses')
                .update({ amount: parseFloat(amount), title: title.trim(), expense_date })
                .eq('id', editingExpenseId);

            if (error) throw error;
            editingExpenseId = null;

            const submitBtn = document.querySelector('#expenseForm button[type="submit"]');
            if (submitBtn) submitBtn.textContent = 'Save Expense';
        } else {
            const { error } = await supabaseClient
                .from('expenses')
                .insert([{ amount: parseFloat(amount), title: title.trim(), expense_date }]);

            if (error) throw error;
        }

        document.getElementById('amount').value = '';
        document.getElementById('title').value = '';
        const badge = document.getElementById('categorySpendBadge');
        if (badge) badge.style.display = 'none';
        
        loadExpenses();
        loadExpenseSuggestions();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

// PDF GENERATOR (MONTHLY & YEARLY FLEXIBLE FILTER)
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
    const reportType = document.getElementById('reportType').value;
    const month = document.getElementById('pdfMonth').value;
    const year = document.getElementById('pdfYear').value;

    if (!year) {
        alert('Kripya Year enter karein (e.g. 2026).');
        return;
    }

    try {
        let query = supabaseClient.from('expenses').select('*');

        if (reportType === 'monthly' && month) {
            // Specific Month + Custom Year
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            query = query.gte('expense_date', startDate).lte('expense_date', endDate);
        } else {
            // Entire Custom Year (Full 12 Months)
            query = query.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
        }

        const { data, error } = await query.order('expense_date', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
            alert(`Selected duration (${reportType === 'monthly' ? 'Month ' + month + ' ' : ''}${year}) ke liye koi data nahi milaa.`);
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const periodText = reportType === 'monthly' ? `${monthNames[month]} ${year}` : `Full Year ${year}`;

        // 1. TOP HEADER BAR
        doc.setFillColor(15, 23, 42); 
        doc.rect(0, 0, 210, 44, 'F');

        doc.setFillColor(16, 185, 129); 
        doc.rect(0, 42, 210, 2, 'F');

        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(20);
        doc.text("barir korcha", 14, 22);

        doc.setFontSize(8.5);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("EXPENSE REPORT & CATEGORY BREAKDOWN", 14, 32);

        doc.setFillColor(30, 41, 59);
        doc.roundedRect(140, 12, 56, 18, 4, 4, 'F');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(52, 211, 153);
        doc.text("VERIFIED REPORT", 148, 23);

        // 2. METRICS & CATEGORY TOTALS
        let totalAmount = 0;
        const categoryTotals = {};

        const rows = data.map((item, idx) => {
            const itemAmt = Number(item.amount);
            totalAmount += itemAmt;

            const cleanTitle = item.title.trim();
            categoryTotals[cleanTitle] = (categoryTotals[cleanTitle] || 0) + itemAmt;

            return [
                idx + 1, 
                item.expense_date, 
                item.title, 
                `INR ${itemAmt.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ];
        });

        // Period Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 52, 88, 22, 4, 4, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("PERIOD", 18, 60);
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(periodText, 18, 68);

        // Grand Total Box
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(108, 52, 88, 22, 4, 4, 'F');
        doc.setFontSize(7);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("GRAND TOTAL SPENT", 112, 60);
        doc.setFontSize(11);
        doc.setTextColor(185, 28, 28);
        doc.text(`INR ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 112, 68);

        // 3. CATEGORY WISE SUMMARY TABLE (PDF Only)
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("Category / Item Breakdown", 14, 82);

        const categoryRows = Object.keys(categoryTotals).map((title, i) => [
            i + 1,
            title,
            `INR ${categoryTotals[title].toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
        ]);

        doc.autoTable({
            startY: 86,
            head: [['#', 'Category Name', 'Total Spent']],
            body: categoryRows,
            theme: 'plain',
            headStyles: { 
                fillColor: [224, 231, 255], 
                textColor: [55, 48, 163],
                fontStyle: 'bold',
                fontSize: 8
            },
            bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 110 },
                2: { cellWidth: 57, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            margin: { left: 14, right: 14 }
        });

        // 4. FULL TRANSACTION TABLE
        const nextY = doc.lastAutoTable.finalY + 12;
        doc.setFontSize(10);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        doc.text("All Transactions", 14, nextY);

        doc.autoTable({
            startY: nextY + 4,
            head: [['#', 'Date', 'Item Details', 'Amount']],
            body: rows,
            theme: 'plain',
            headStyles: { 
                fillColor: [241, 245, 249], 
                textColor: [71, 85, 105],
                fontStyle: 'bold',
                fontSize: 8
            },
            bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center' },
                1: { cellWidth: 35 },
                2: { cellWidth: 85 },
                3: { cellWidth: 47, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            margin: { left: 14, right: 14 }
        });

        // 5. FOOTER
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 286);
            doc.text(`Page ${i} of ${pageCount}`, 180, 286);
        }

        const fileName = reportType === 'monthly' ? `Barir_Korcha_${monthNames[month]}_${year}.pdf` : `Barir_Korcha_Year_${year}.pdf`;
        doc.save(fileName);

        const drawer = document.getElementById('drawerMenu');
        if (drawer) drawer.classList.remove('active');

    } catch (err) {
        alert(`PDF Error: ${err.message}`);
    }
});
