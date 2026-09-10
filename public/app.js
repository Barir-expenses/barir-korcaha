// 1. Supabase Connection Setup
const SUPABASE_URL = "YOUR_SUPABASE_URL_HERE"; 
const SUPABASE_ANON_KEY = "YOUR_SUPABASE_ANON_KEY_HERE";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Page Load Operations
document.addEventListener('DOMContentLoaded', () => {
    const dateInput = document.getElementById('expense_date');
    if (dateInput) {
        dateInput.valueAsDate = new Date();
    }
    loadExpenses();
});

// 2. Load Expenses History Table
async function loadExpenses() {
    try {
        const { data, error } = await supabaseClient
            .from('expenses')
            .select('*')
            .order('expense_date', { ascending: false });

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
                        <td>₹${Number(item.amount).toFixed(2)}</td>
                    </tr>
                `;
            });
        } else {
            tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;">No expenses added yet.</td></tr>`;
        }
    } catch (err) {
        console.error("Error loading expenses:", err.message);
    }
}

// 3. Add Expense Handler
const expenseForm = document.getElementById('expenseForm');
if (expenseForm) {
    expenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const amount = document.getElementById('amount').value;
        const title = document.getElementById('title').value;
        const expense_date = document.getElementById('expense_date').value;

        try {
            const { data, error } = await supabaseClient
                .from('expenses')
                .insert([{ amount: parseFloat(amount), title, expense_date }]);

            if (error) throw error;

            document.getElementById('amount').value = '';
            document.getElementById('title').value = '';
            loadExpenses(); // Table Reload
            alert('Expense saved successfully!');
        } catch (err) {
            console.error("Error saving expense:", err);
            alert(`Error Saving Expense: ${err.message}`);
        }
    });
}

// 4. Generate & Download PDF Directly in Browser
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
if (downloadPdfBtn) {
    downloadPdfBtn.addEventListener('click', async () => {
        const month = document.getElementById('pdfMonth').value;
        const year = document.getElementById('pdfYear').value;

        try {
            let query = supabaseClient.from('expenses').select('*');

            // Apply Month and Year Filters
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
                alert('No data found for the selected period.');
                return;
            }

            // PDF Creation Logic
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();

            const reportTitle = month && year 
                ? `Monthly Expense Report (${month}/${year})`
                : `Yearly Expense Report (${year || 'All Time'})`;

            doc.setFontSize(18);
            doc.text(reportTitle, 14, 20);

            let totalAmount = 0;
            const rows = data.map((item, idx) => {
                totalAmount += Number(item.amount);
                return [idx + 1, item.expense_date, item.title, `Rs. ${Number(item.amount).toFixed(2)}`];
            });

            // Add Table to PDF
            doc.autoTable({
                startY: 28,
                head: [['#', 'Date', 'Expense Name', 'Amount']],
                body: rows,
            });

            const finalY = doc.lastAutoTable.finalY || 40;
            doc.setFontSize(14);
            doc.text(`Total Amount: Rs. ${totalAmount.toFixed(2)}`, 14, finalY + 12);

            // Save / Download PDF File
            doc.save(`Expense_Report_${month || 'All'}_${year || 'Time'}.pdf`);

        } catch (err) {
            console.error("Error generating PDF:", err);
            alert(`PDF Generation Error: ${err.message}`);
        }
    });
}
