// Credentials (Apni Supabase URL & Anon Key yaha daalein)
const SUPABASE_URL = "https://your-supabase-url.supabase.co"; 
const SUPABASE_ANON_KEY = "your-supabase-anon-key";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('expense_date').valueAsDate = new Date();
    loadExpenses();

    // 3-Line Menu Drawer Controls
    const drawer = document.getElementById('drawerMenu');
    document.getElementById('menuToggle').addEventListener('click', () => drawer.classList.add('active'));
    document.getElementById('closeDrawer').addEventListener('click', () => drawer.classList.remove('active'));
});

// Expenses Fetch Logic
async function loadExpenses() {
    try {
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

        if (error) throw error;

        const tbody = document.getElementById('expenseList');
        tbody.innerHTML = '';

        if (data && data.length > 0) {
            data.forEach(item => {
                tbody.innerHTML += `
                    <tr>
                        <td>${item.expense_date}</td>
                        <td>${item.title}</td>
                        <td><strong>₹${Number(item.amount).toFixed(2)}</strong></td>
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

// Save Expense Logic
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = document.getElementById('amount').value;
    const title = document.getElementById('title').value;
    const expense_date = document.getElementById('expense_date').value;

    try {
        const { error } = await supabaseClient
            .from('expenses')
            .insert([{ amount: parseFloat(amount), title, expense_date }]);

        if (error) throw error;

        document.getElementById('amount').value = '';
        document.getElementById('title').value = '';
        loadExpenses();
    } catch (err) {
        alert(`Error: ${err.message}`);
    }
});

// PDF Generation Logic (Pro Design)
document.getElementById('downloadPdfBtn').addEventListener('click', async () => {
    const month = document.getElementById('pdfMonth').value;
    const year = document.getElementById('pdfYear').value;

    try {
        let query = supabaseClient.from('expenses').select('*');

        if (year && month) {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const lastDay = new Date(year, month, 0).getDate();
            const endDate = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
            query = query.gte('expense_date', startDate).lte('expense_date', endDate);
        } else if (year) {
            query = query.gte('expense_date', `${year}-01-01`).lte('expense_date', `${year}-12-31`);
        }

        const { data, error } = await query.order('expense_date', { ascending: true });

        if (error) throw error;
        if (!data || data.length === 0) {
            alert('No data found for selected period.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        // PDF Header styling
        doc.setFillColor(79, 70, 229);
        doc.rect(0, 0, 210, 28, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.text("Expense Statement Report", 14, 18);

        let totalAmount = 0;
        const rows = data.map((item, idx) => {
            totalAmount += Number(item.amount);
            return [idx + 1, item.expense_date, item.title, `Rs. ${Number(item.amount).toFixed(2)}`];
        });

        // Table Styling
        doc.autoTable({
            startY: 36,
            head: [['#', 'Date', 'Description', 'Amount']],
            body: rows,
            headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255] },
            alternateRowStyles: { fillColor: [248, 250, 252] },
        });

        // Footer Summary
        const finalY = doc.lastAutoTable.finalY || 40;
        doc.setFontSize(12);
        doc.setTextColor(15, 23, 42);
        doc.text(`Total Expense: Rs. ${totalAmount.toFixed(2)}`, 14, finalY + 12);

        doc.save(`Report_${month || 'All'}_${year}.pdf`);
        document.getElementById('drawerMenu').classList.remove('active');

    } catch (err) {
        alert(`PDF Error: ${err.message}`);
    }
});
