import sys
import json
import traceback
from escpos.printer import Win32Raw

# --- CONFIGURATION ---
# Exact printer name as shown in Windows "Printers & Scanners"
PRINTER_NAME = "POS-80C"

def print_receipt(data):
    try:
        p = Win32Raw(printer_name=PRINTER_NAME)

        # Header - Scaled down from double size to just Bold for a cleaner look
        p.set(align='center', bold=True, double_height=False, double_width=False)
        p.text("CELEB SHOP\n")

        p.set(align='center', bold=False)
        p.text("THE ALTITUDE\n")
        p.text(f"DATE: {data.get('date', 'N/A')}\n")

        if data.get('transactionId'):
            p.text(f"RECEIPT: {data['transactionId']}\n")

        if data.get('servedBy'):
            staff = data['servedBy'].get('username', 'Staff') if isinstance(data['servedBy'], dict) else str(data['servedBy'])
            p.text(f"STAFF: {staff}\n")

        # Standard 80mm width is typically 42-48 chars. 42 is safest for alignment.
        LINE_WIDTH = 42
        p.text("-" * LINE_WIDTH + "\n")

        # Table Header - Using standard size but bold
        p.set(align='left', bold=True)
        # 20 (Item) + 5 (Qty) + 8 (Prc) + 9 (Tot) = 42
        header = "ITEM".ljust(20) + "QTY".center(5) + "PRC".rjust(8) + "TOT".rjust(9)
        p.text(header + "\n")
        p.set(align='left', bold=False)

        # Items
        for item in data.get('items', []):
            name  = str(item.get('name', 'Item'))[:19].ljust(20)
            qty   = str(item.get('quantity', 0)).center(5)
            price = str(int(float(item.get('price', 0)))).rjust(8)
            total = str(int(float(item.get('quantity', 0)) * float(item.get('price', 0)))).rjust(9)
            p.text(f"{name}{qty}{price}{total}\n")

        p.text("-" * LINE_WIDTH + "\n")

        # Total - Bold but not double height to save space and look cleaner
        p.set(align='right', bold=True)
        total_val = float(data.get('total', 0))
        p.text(f"TOTAL: Ksh {total_val:.2f}\n")

        # Payments & Change
        p.set(align='right', bold=False)
        p.text("-" * 21 + "\n") # Divider for totals area
        
        # Cash Tendered (The actual bill given by user)
        cash_tendered = data.get('cashTendered')
        if cash_tendered and float(cash_tendered) > 0:
            p.text(f"CASH TENDERED: Ksh {float(cash_tendered):.2f}\n")

        # Change Due (Calculated change)
        change_due = data.get('changeDue', 0)
        if change_due and float(change_due) > 0:
            p.set(align='right', bold=True)
            p.text(f"CHANGE DUE: Ksh {float(change_due):.2f}\n")
            p.set(align='right', bold=False)

        p.text("-" * LINE_WIDTH + "\n")

        # Payment Methods breakdown
        for payment in data.get('payments', []):
            method = payment.get('method', 'Paid').upper()
            amount = float(payment.get('amount', 0))
            p.text(f"{method}: Ksh {amount:.2f}\n")
        
        # Footer
        p.set(align='center', bold=False)
        p.text("\nTHANK YOU FOR YOUR PURCHASE!\n")
        p.text("\n\n\n")  # Paper feed

        p.cut()
        # Win32Raw flushes automatically; no explicit close needed

        return True

    except Exception as e:
        error_msg = f"Printer Error: {str(e)}\n{traceback.format_exc()}"
        sys.stderr.write(error_msg)
        return False


if __name__ == "__main__":
    try:
        input_data = sys.stdin.read()
        if input_data:
            parsed_data = json.loads(input_data)
            success = print_receipt(parsed_data)
            if success:
                sys.stdout.write(json.dumps({"success": True}))
            else:
                sys.stdout.write(json.dumps({"success": False, "error": "Printing failed, check stderr"}))
        else:
            sys.stdout.write(json.dumps({"success": False, "error": "No data received"}))
    except Exception as e:
        sys.stdout.write(json.dumps({"success": False, "error": f"JSON/System Error: {str(e)}"}))
