import pandas as pd
from datetime import date
from telegram import Update, ReplyKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, filters, ContextTypes

# ---------------- CONFIG ----------------
BOT_TOKEN = "##############" # Replace with your telegram bot token
PASSWORD = "kmrl2025"

# ---------------- DATA LOADER ----------------
def load_data():
    """Load metro CSV data."""
    try:
        df = pd.read_csv("metro_data.csv")
        # Convert fitness columns to datetime
        for col in ["Fitness_RollingStock_ValidTill", "Fitness_Signalling_ValidTill", "Fitness_Telecom_ValidTill"]:
            df[col] = pd.to_datetime(df[col])
        return df
    except FileNotFoundError:
        print("Error: metro_data.csv not found!")
        return None

# ---------------- HELPERS ----------------
def derive_status(row):
    """Derive operational/maintenance status from JobCard_OpenOrders."""
    return "For Maintenance" if row["JobCard_OpenOrders"] > 0 else "Operational"

def get_summary(df):
    """Show revenue, standby, and IBL counts."""
    df["status"] = df.apply(derive_status, axis=1)
    revenue = (df["status"] == "Operational").sum()
    ibl = (df["status"] == "For Maintenance").sum()
    standby = len(df) - revenue - ibl
    return f"🚆 Current Fleet Status\n- Revenue: {revenue}\n- Standby: {standby}\n- IBL: {ibl}"

def get_due_soon(df, days=7):
    alerts = []
    today = date.today()

    for cert in ["Fitness_RollingStock_ValidTill", "Fitness_Signalling_ValidTill", "Fitness_Telecom_ValidTill"]:
        # Convert to datetime safely
        df[cert] = pd.to_datetime(df[cert], errors='coerce')
        due = df[df[cert].dt.date <= (today + pd.Timedelta(days=days))]
        for _, row in due.iterrows():
            if pd.isna(row[cert]):
                continue
            left = (row[cert].date() - today).days
            alerts.append(f"- {row['Trainset_ID']}: {cert.replace('_',' ').title()} {left} days")

    if not alerts:
        return "✅ No certificates expiring soon."
    
    # Telegram limit check
    message = "⚠️ Maintenance Due Soon:\n"
    chunk_size = 3500  # keep buffer
    final_messages = []
    current_chunk = message
    for alert in alerts:
        if len(current_chunk) + len(alert) + 1 > chunk_size:
            final_messages.append(current_chunk)
            current_chunk = alert + "\n"
        else:
            current_chunk += alert + "\n"
    final_messages.append(current_chunk)
    
    return final_messages

def get_train_info(df, train_id):
    """Return detailed info for a specific train."""
    row = df[df["Trainset_ID"] == train_id]
    if row.empty:
        return f"❌ No train found with ID {train_id}"
    row = row.iloc[0]
    status = derive_status(row)
    return (
        f"🚇 Train {row['Trainset_ID']}\n"
        f"Status: {status}\n"
        f"KM Reading: {row['Mileage_KM']}\n"
        f"Rolling Stock Cert: {row['Fitness_RollingStock_ValidTill'].date()}\n"
        f"Signalling Cert: {row['Fitness_Signalling_ValidTill'].date()}\n"
        f"Telecom Cert: {row['Fitness_Telecom_ValidTill'].date()}\n"
        f"Branding Hours Required: {row['Branding_Exposure_HoursRequired']}\n"
        f"Cleaning Slot Available: {row['Cleaning_Slot_Available']}\n"
        f"Bay Position: {row['Bay_Position']}\n"
        f"Shunting Distance (m): {row['Shunting_Distance_m']}\n"
        f"Performance Score: {row['Performance_Score']}"
    )

# ---------------- HANDLERS ----------------
async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Ask user for password."""
    await update.message.reply_text("🔑 Enter password to access metro bot:")

async def sensor_alert(context: ContextTypes.DEFAULT_TYPE):
    """Send automated sensor alert after login."""
    chat_id = context.job.chat_id if getattr(context, "job", None) else None
    if chat_id:
        await context.bot.send_message(chat_id=chat_id, text="🚨 ALERT: A sensor on a train has failed!")

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    """Handle all text messages, check auth, and execute commands."""
    user_input = update.message.text.strip() if update.message and update.message.text else ""

    # --- AUTHENTICATION ---
    if not context.user_data.get("authorized", False):
        if user_input == PASSWORD:
            context.user_data["authorized"] = True
            keyboard = [["📊 Show Status", "⚠️ Maintenance Alerts"], ["🔍 Search Train", "📂 Export CSV", "➕ Add Data"]]
            reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
            await update.message.reply_text("✅ Authenticated! Use the buttons below:", reply_markup=reply_markup)
            # Schedule sensor alert after 20s
            context.job_queue.run_once(sensor_alert, 20, chat_id=update.effective_chat.id)
        else:
            await update.message.reply_text("❌ Wrong password. Try again.")
        return

    # --- AUTHORIZED USER ---
    df = context.bot_data.get("data")
    if df is None:
        await update.message.reply_text("❌ Error: Bot data could not be loaded.")
        return

    if user_input == "📊 Show Status":
        await update.message.reply_text(get_summary(df))
    elif user_input == "⚠️ Maintenance Alerts":
        messages = get_due_soon(df)
        for msg in messages:
            await update.message.reply_text(msg)
    elif user_input == "🔍 Search Train":
        await update.message.reply_text("Enter train ID like: KM07")
    elif user_input.startswith("KM"):
        await update.message.reply_text(get_train_info(df, user_input))
    elif user_input == "📂 Export CSV":
        try:
            with open("metro_data.csv", "rb") as f:
                await update.message.reply_document(document=f, filename="metro_data.csv")
        except FileNotFoundError:
            await update.message.reply_text("❌ CSV file not found.")
    elif user_input == "➕ Add Data":
        keyboard = [["📸 Photo", "📄 Document", "✏️ Text"]]
        reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
        await update.message.reply_text("Select input type to add data:", reply_markup=reply_markup)
    elif user_input == "➕ Add Data":
        keyboard = [["📸 Photo", "📄 Document", "✏️ Text"]]
        reply_markup = ReplyKeyboardMarkup(keyboard, resize_keyboard=True)
        await update.message.reply_text("Select input type to add data:", reply_markup=reply_markup)
    elif 'input_type' in context.user_data:
        input_type = context.user_data.pop('input_type')  # remove after using

        # Initialize CSV
        df = pd.read_csv("metro_data.csv")

        if input_type == "✏️ Text":
            content = user_input
            # Here you would call Gemini API to process `content` into structured data
            new_row = process_text_to_row(content)  # define this function
        elif input_type == "📄 Document" and update.message.document:
            file = await update.message.document.get_file()
            path = f"downloads/{update.message.document.file_name}"
            await file.download_to_drive(path)
            new_row = process_file_to_row(path)  # placeholder function
        elif input_type == "📸 Photo" and update.message.photo:
            file = await update.message.photo[-1].get_file()
            path = f"downloads/photo_{file.file_id}.jpg"
            await file.download_to_drive(path)
            new_row = process_file_to_row(path)  # placeholder function
        else:
            await update.message.reply_text("❌ Invalid input. Please try again.")
            return

        # Append to CSV
        df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
        df.to_csv("metro_data.csv", index=False)

        await update.message.reply_text("✅ Data processed and added to CSV successfully!")

    else:
        await update.message.reply_text("🤖 Unknown command")

# ---------------- MAIN ----------------
def main():
    app = Application.builder().token(BOT_TOKEN).build()

    # Load data once
    df = load_data()
    if df is not None:
        app.bot_data['data'] = df
    else:
        print("Bot cannot function without CSV.")
        return

    # Handlers
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    # Run the bot
    app.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()


