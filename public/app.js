// Credentials (Apni Supabase URL & Anon Key yaha daalein)
const SUPABASE_URL = "https://gmsapmodgwhmsgmgdzfm.supabase.co"; 
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdtc2FwbW9kZ3dobXNnbWdkemZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwNTEyMzAsImV4cCI6MjEwNDYyNzIzMH0.XJm5a28xV-wF9_y7F4q8JiS73Ui8rFIczUDb63WJ1RM";

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

// UNIQUE MODERN EXECUTIVE PDF GENERATOR
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
            alert('Selected duration ke liye koi data nahi milaa.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        const monthNames = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const periodText = month ? `${monthNames[month]} ${year}` : `Year ${year || 'All Time'}`;

        // 1. MODERN TOP HEADER BAR
        doc.setFillColor(15, 23, 42); // Ultra Dark Slate (#0f172a)
        doc.rect(0, 0, 210, 48, 'F');

        // Neon Accent Line
        doc.setFillColor(16, 185, 129); // Emerald Green Accent
        doc.rect(0, 46, 210, 2, 'F');

        // App Name & Subtitle
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.text("barir korcha", 14, 24);

        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(148, 163, 184);
        doc.text("PERSONAL FINANCIAL SUMMARY", 14, 34);

        // Header Status Badge
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(140, 14, 56, 20, 5, 5, 'F');
        doc.setFontSize(8);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(52, 211, 153); // Mint Green
        doc.text("VERIFIED REPORT", 148, 26);

        // 2. METRIC HIGHLIGHT CARDS
        let totalAmount = 0;
        const rows = data.map((item, idx) => {
            totalAmount += Number(item.amount);
            return [
                idx + 1, 
                item.expense_date, 
                item.title, 
                `INR ${Number(item.amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            ];
        });

        // Left Metric Box
        doc.setFillColor(248, 250, 252);
        doc.roundedRect(14, 58, 88, 24, 4, 4, 'F');
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(100, 116, 139);
        doc.text("PERIOD", 20, 66);
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(periodText, 20, 75);

        // Right Metric Box (Total Expenses)
        doc.setFillColor(254, 242, 242);
        doc.roundedRect(108, 58, 88, 24, 4, 4, 'F');
        doc.setFontSize(7.5);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(220, 38, 38);
        doc.text("TOTAL SPENT", 114, 66);
        doc.setFontSize(12);
        doc.setTextColor(185, 28, 28);
        doc.text(`INR ${totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`, 114, 75);

        // 3. CLEAN MODERN TABLE STYLE
        doc.autoTable({
            startY: 92,
            head: [['#', 'Date', 'Transaction Details', 'Amount']],
            body: rows,
            theme: 'plain',
            headStyles: { 
                fillColor: [241, 245, 249], 
                textColor: [71, 85, 105],
                fontStyle: 'bold',
                fontSize: 8.5,
                cellPadding: 5
            },
            bodyStyles: { 
                fontSize: 9, 
                textColor: [30, 41, 59],
                cellPadding: 4.5
            },
            alternateRowStyles: { 
                fillColor: [248, 250, 252] 
            },
            columnStyles: {
                0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
                1: { cellWidth: 35 },
                2: { cellWidth: 85 },
                3: { cellWidth: 47, halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38] }
            },
            margin: { left: 14, right: 14 }
        });

        // 4. BOTTOM SIGNATURE & FOOTER
        const finalY = doc.lastAutoTable.finalY || 120;
        
        if (finalY + 30 < 270) {
            doc.setDrawColor(203, 213, 225);
            doc.line(14, finalY + 20, 64, finalY + 20);
            doc.setFontSize(8);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(148, 163, 184);
            doc.text("Authorized Signature", 14, finalY + 25);
        }

        // Page Numbers
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 286);
            doc.text(`Page ${i} of ${pageCount}`, 180, 286);
        }

        doc.save(`Barir_Korcha_${month || 'All'}_${year}.pdf`);
        document.getElementById('drawerMenu').classList.remove('active');

    } catch (err) {
        alert(`PDF Error: ${err.message}`);
    }
});
