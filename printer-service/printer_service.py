import sys
import json
import traceback
from escpos.printer import Win32Raw

# --- CONFIGURATION ---
# Exact printer name as shown in Windows "Printers & Scanners"
PRINTER_NAME = "POS-80C (copy 1)"

def print_receipt(data):
    try:
        p = Win32Raw(printer_name=PRINTER_NAME)

        # Header - Scaled down from double size to just Bold for a cleaner look
        p.set(align='center', bold=True, double_height=False, double_width=False)
        p.text("CELEB SHOP\n")

        p.set(align='center', bold=False)
        p.text("APPLE TREE\n")
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
        p.text(f"TOTAL: Ksh {float(data.get('total', 0)):.2f}\n")

        # Payments
        p.set(align='right', bold=False, double_height=False)
        for payment in data.get('payments', []):
            method = payment.get('method', 'Paid').upper()
            amount = float(payment.get('amount', 0))
            p.text(f"{method}: Ksh {amount:.2f}\n")

        # Change
        balance = data.get('balanceDue', 0)
        if balance and float(balance) > 0:
            p.set(align='right', bold=True)
            p.text(f"CHANGE: Ksh {float(balance):.2f}\n")

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
