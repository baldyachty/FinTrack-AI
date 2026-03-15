import sys
import os
print("--- DIAGNOSTIC ---")
print(f"Python Executable Path: {sys.executable}")
from flask import Flask, jsonify, request, render_template
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
# Import  JWT functions
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
from flask_cors import CORS
from dotenv import load_dotenv
from datetime import datetime, date, timedelta 
import calendar 
from sqlalchemy import func
from collections import defaultdict 
import json
import requests
import pyotp
import csv
import secrets
import string
import io
from flask import make_response
from flask_mail import Mail, Message
app = Flask(__name__, instance_relative_config=True)


app.config['MAIL_SERVER'] = 'smtp.gmail.com'
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD')
mail = Mail(app)
# Imports for Forecasting AI
from statsmodels.tsa.arima.model import ARIMA
import pandas as pd 
import joblib 

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.neighbors import KNeighborsClassifier
from sklearn.pipeline import Pipeline
from sklearn.ensemble import IsolationForest  
from sklearn.preprocessing import StandardScaler  



# Load environment 
load_dotenv()
CORS(app)



try:
    # Check if app.instance_path exists and is a directory
    if not os.path.exists(app.instance_path):
        os.makedirs(app.instance_path)
        print(f"Created instance folder at: {app.instance_path}")
    elif not os.path.isdir(app.instance_path):
        # Handle case where instance_path exists but is not a directory
        print(f"Error: Path exists but is not a directory: {app.instance_path}")
        # Optionally raise an exception or exit here depending on desired behavior
except OSError as e:
    # Ignore error if directory already exists (errno 17)
    if e.errno != 17:
        print(f"Error creating instance folder: {e}")
    # Otherwise, pass if it already exists
    pass

# Use instance folder for db path construction
db_path = os.path.join(app.instance_path, 'fintrack.db')
app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}" # Use f-string for clarity
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False # Recommended setting
# Get the secret key from .env file, provide a default for safety
app.config["JWT_SECRET_KEY"] = os.environ.get('JWT_SECRET_KEY', 'default-super-secret-key-please-change') 
print(f"Database URI set to: {app.config['SQLALCHEMY_DATABASE_URI']}")


# Extensions Initialization 
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
jwt = JWTManager(app)

# ML Model Cache
# Cache for holding trained models in memory (user_id: model)
user_models = {}
# Database Models

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(128), nullable=False)
    avatar_url = db.Column(db.Text, nullable=True, default='data:image/svg+xml;base64,...')

    # Added Settings Columns
    theme = db.Column(db.String(10), nullable=True, default='light') # 'light' or 'dark'
    accent_color = db.Column(db.String(10), nullable=True, default='#6366f1') # Default hex color
    #  Notification Preferences
    notify_summary = db.Column(db.Boolean, default=False)
    notify_alerts = db.Column(db.Boolean, default=False)
    notify_updates = db.Column(db.Boolean, default=False)
    two_factor_secret = db.Column(db.String(32), nullable=True)
    two_factor_enabled = db.Column(db.Boolean, default=False)
    
    recovery_codes = db.Column(db.Text, nullable=True)
    transactions = db.relationship('Transaction', backref='owner', lazy=True)
    budgets = db.relationship('Budget', backref='owner', lazy=True)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    description = db.Column(db.String(200), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    category = db.Column(db.String(50), nullable=False)
    date = db.Column(db.Date, nullable=False)
    type = db.Column(db.String(10), nullable=False)  # 'income' or 'expense'
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    is_anomaly = db.Column(db.Boolean, default=False, nullable=True)

class Budget(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.String(50), nullable=False)
    total_amount = db.Column(db.Float, nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
def get_model_path(user_id, model_type):
    """Returns the file path for a user's specific model."""
    # e.g., user_1_categorizer.joblib or user_1_anomaly.joblib
    return os.path.join(app.instance_path, f"user_{user_id}_{model_type}.joblib")

def _train_user_model(user_id, model_type):
    """
    Trains a new model (categorizer or anomaly) for a user and saves it.
    Returns the trained model or None if training failed.
    """
    print(f"--- Training new '{model_type}' model for user {user_id} ---")
    try:
        # All training is based on past expenses
        transactions = Transaction.query.filter_by(user_id=user_id, type='expense').all()
        if not transactions:
            print("No transactions found, cannot train.")
            return None

        # MODEL 1: CATEGORIZER (Text Classification)
        if model_type == 'categorizer':
            data = {'description': [t.description for t in transactions],
                    'category': [t.category for t in transactions]}
            df = pd.DataFrame(data)

            # Need at least 5 samples and 2 unique categories
            if len(df) < 5 or df['category'].nunique() < 2:
                print(f"Not enough data for categorizer ({len(df)} samples), skipping.")
                return None

            model_pipeline = Pipeline([
                ('tfidf', TfidfVectorizer()),
                ('clf', KNeighborsClassifier(n_neighbors=1))
            ])
            model_pipeline.fit(df['description'], df['category'])

        # MODEL 2: ANOMALY (Outlier Detection)
        elif model_type == 'anomaly':
            # This model learns from "amount" and "category"
            data = {
                'amount': [t.amount for t in transactions],
                'category': [t.category for t in transactions],
            }
            df = pd.DataFrame(data)

            # Anomaly detection needs more data to find a "normal" baseline
            if len(df) < 20: 
                print(f"Not enough data for anomaly model ({len(df)} samples), skipping.")
                return None

            # Convert 'category' text into separate numerical 0/1 columns
            df_processed = pd.get_dummies(df, columns=['category'])

            # Define the model pipeline
            model_pipeline = Pipeline([
                ('scaler', StandardScaler()), # Scales numbers to be consistent
                ('model', IsolationForest(contamination=0.05)) # Flag top 5% as "weird"
            ])

            model_pipeline.fit(df_processed)

        else:
            print(f"Unknown model type: {model_type}")
            return None

        # Save the trained model to disk
        model_path = get_model_path(user_id, model_type)
        joblib.dump(model_pipeline, model_path)

        print(f"Model trained and saved to {model_path}")
        return model_pipeline

    except Exception as e:
        print(f"Error during model training for user {user_id}: {e}")
        return None

def _get_or_load_model(user_id, model_type):
    """
    Gets a user's model from cache, disk, or trains a new one.
    Handles different model types.
    """
    cache_key = f"{user_id}_{model_type}" 

    # 1. Check cache
    if cache_key in user_models:
        print(f"Model {cache_key} found in cache.")
        return user_models[cache_key]

    # 2. Check disk
    model_path = get_model_path(user_id, model_type)
    if os.path.exists(model_path):
        try:
            print(f"Loading model {cache_key} from disk...")
            model = joblib.load(model_path)
            user_models[cache_key] = model # Save to cache
            return model
        except Exception as e:
            print(f"Error loading model from disk: {e}. Retraining.")

    # 3. Train new model
    model = _train_user_model(user_id, model_type)
    if model:
        user_models[cache_key] = model # Save to cache
        return model

    return None # Training failed


def get_current_user_object():
    """Helper function to get the User database object from the JWT token's identity."""
    user_id_str = get_jwt_identity() 
    if not user_id_str:
        return None
    try:
        
        user = User.query.get(int(user_id_str))
        return user
    except ValueError:
        # Handle cases where identity might not be a valid integer string
        print(f"Warning: Invalid user ID format in JWT: {user_id_str}")
        return None


#  Auth Endpoints 

@app.route('/api/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data: return jsonify({"msg": "Missing JSON in request"}), 400
    email = data.get('email')
    name = data.get('name')
    password = data.get('password')

    if not email or not name or not password:
        return jsonify({"msg": "Missing required fields"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 400
    if len(password) < 6:
        return jsonify({"msg": "Password must be at least 6 characters"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')

    # Create user with default settings from the model
    new_user = User(name=name, email=email, password_hash=hashed_password)
    try:
        db.session.add(new_user)
        db.session.commit() # Commit to get the new_user.id
    except Exception as e:
        db.session.rollback()
        print(f"Error saving new user: {e}")
        return jsonify({"msg": "Database error during registration"}), 500


    access_token = create_access_token(identity=str(new_user.id)) # Use the committed user ID

    # UPDATED RESPONSE
    return jsonify({
        "msg": "Registration successful",
        "token": access_token,
        "user": {
            "name": new_user.name,
            "email": new_user.email,
            "avatar": new_user.avatar_url,
            "theme": new_user.theme,             
            "accent_color": new_user.accent_color, 
            "two_factor_enabled": new_user.two_factor_enabled
        }
    }), 201

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data: return jsonify({"msg": "Missing JSON in request"}), 400
    email = data.get('email')
    password = data.get('password')

    if not email or not password:
        return jsonify({"msg": "Missing email or password"}), 400

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password_hash, password):
        #  Check if 2FA is enabled for this user
        if user.two_factor_enabled:
            return jsonify({
                "msg": "2FA Required",
                "two_factor_required": True,
                "email": user.email  #  send the email so the frontend knows who is trying to log in
            }), 200
        
        # The Original logic continues if 2FA is NOT enabled 
        access_token = create_access_token(identity=str(user.id))

        return jsonify({
            "msg": "Login successful",
            "token": access_token,
            "user": {
                "name": user.name,
                "email": user.email,
                "avatar": user.avatar_url,
                "theme": user.theme,
                "accent_color": user.accent_color,
                "two_factor_enabled": user.two_factor_enabled
            }
        }), 200
    else:
        return jsonify({"msg": "Invalid email or password"}), 401
    
#Transaction Endpoints
@app.route('/api/2fa/login', methods=['POST'])
def login_2fa():
    data = request.get_json()
    email = data.get('email')
    code = data.get('code')

    user = User.query.filter_by(email=email).first()
    if not user or not user.two_factor_secret:
        return jsonify({"msg": "Invalid request"}), 400

    # 1. First, verifying as a standard 6-digit TOTP code
    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        return _issue_2fa_token(user)

    # 2. If TOTP fails, check if it's a valid 8-character backup code
    if user.recovery_codes:
        # Load the list of hashed codes from the database
        saved_hashed_codes = json.loads(user.recovery_codes)
        
        for i, hashed_code in enumerate(saved_hashed_codes):
            # Compare the entered code with the hashed backup code
            if bcrypt.check_password_hash(hashed_code, code):
                # SUCCESS: Remove the used code so it can't be used again
                saved_hashed_codes.pop(i)
                user.recovery_codes = json.dumps(saved_hashed_codes)
                db.session.commit()
                
                return _issue_2fa_token(user)

    # If both checks fail, then return the error
    return jsonify({"msg": "Invalid authentication code"}), 401

# Helper function to avoid repeating the user data JSON
def _issue_2fa_token(user):
    access_token = create_access_token(identity=str(user.id))
    return jsonify({
        "token": access_token,
        "user": {
            "name": user.name,
            "email": user.email,
            "avatar": user.avatar_url,
            "theme": user.theme,
            "accent_color": user.accent_color,
            "two_factor_enabled": user.two_factor_enabled
        }
    }), 200
@app.route('/api/2fa/setup', methods=['POST'])
@jwt_required()
def setup_2fa():
    user = get_current_user_object() 
    if not user: return jsonify({"msg": "User not found"}), 404

    # Generate a secret if the user doesn't have one yet
    if not user.two_factor_secret:
        user.two_factor_secret = pyotp.random_base32()
        db.session.commit()

    # Create the URI that the frontend will turn into a QR code
    totp = pyotp.TOTP(user.two_factor_secret)
    provisioning_uri = totp.provisioning_uri(name=user.email, issuer_name="FinTrack AI")

    return jsonify({
        "secret": user.two_factor_secret,
        "uri": provisioning_uri
    }), 200

@app.route('/api/2fa/verify', methods=['POST'])
@jwt_required()
def verify_2fa():
    user = get_current_user_object()
    data = request.get_json()
    code = data.get('code')

    totp = pyotp.TOTP(user.two_factor_secret)
    if totp.verify(code):
        user.two_factor_enabled = True
        
        #Generate 10 Recovery Codes ---
        new_codes = []
        for _ in range(10):
            # Generate a random 8-character code like 'A1B2-C3D4'
            raw_code = ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(8))
            # it stores the hashed version for security, but we show the raw code to the user once
            hashed_code = bcrypt.generate_password_hash(raw_code).decode('utf-8')
            new_codes.append({"raw": raw_code, "hashed": hashed_code})
        
        # Save only the hashed versions to the DB
        user.recovery_codes = json.dumps([c['hashed'] for c in new_codes])
        db.session.commit()

        # Send the RAW codes back to the frontend ONLY THIS ONCE
        return jsonify({
            "msg": "2FA enabled successfully",
            "recovery_codes": [c['raw'] for c in new_codes] 
        }), 200
    else:
        return jsonify({"msg": "Invalid verification code"}), 400
@app.route('/api/2fa/disable', methods=['POST'])
@jwt_required()
def disable_2fa():
    user = get_current_user_object()
    data = request.get_json()
    code = data.get('code')

    if not code:
        return jsonify({"msg": "Verification code required"}), 400

    # Verification check (Same logic as login)
    is_valid = False
    totp = pyotp.TOTP(user.two_factor_secret)
    
    if totp.verify(code):
        is_valid = True
    elif user.recovery_codes:
        saved_codes = json.loads(user.recovery_codes)
        for i, hashed_code in enumerate(saved_codes):
            if bcrypt.check_password_hash(hashed_code, code):
                saved_codes.pop(i)
                user.recovery_codes = json.dumps(saved_codes)
                is_valid = True
                break

    if is_valid:
        user.two_factor_enabled = False
        user.two_factor_secret = None  # Clear secret for a fresh start later
        user.recovery_codes = None
        db.session.commit()
        return jsonify({"msg": "2FA disabled successfully"}), 200
    
    return jsonify({"msg": "Invalid verification code"}), 401
@app.route('/api/forgot-password', methods=['POST'])
def forgot_password():
    data = request.get_json()
    email = data.get('email')
    user = User.query.filter_by(email=email).first()

    if not user:
        # For security, don't reveal if the email exists or not
        return jsonify({"msg": "If that email exists, a reset link has been sent."}), 200

    # Create a reset token that expires in 15 minutes
    reset_token = create_access_token(identity=str(user.id), expires_delta=timedelta(minutes=15))
    
    # The link the user will click in their email
    reset_link = f"http://127.0.0.1:5500/welcome/reset-password.html?token={reset_token}"

    msg = Message("Reset Your FinTrack AI Password",
                  sender="fintrackintelligence@gmail.com",
                  recipients=[email])
    msg.body = f"Hello {user.name},\n\nClick the link below to reset your password. This link expires in 15 minutes:\n{reset_link}"
    
    
    
    mail.send(msg)
    return jsonify({"msg": "Reset link sent to your email."}), 200
@app.route('/api/reset-password', methods=['POST'])
@jwt_required()
def reset_password():
    user_id = get_jwt_identity()
    data = request.get_json()
    new_password = data.get('password')

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404

    
    user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
    db.session.commit()

    return jsonify({"msg": "Password updated successfully"}), 200

@app.route('/api/transactions', methods=['GET'])
@jwt_required()
def get_transactions():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
    except ValueError:
        return jsonify({"msg": "Invalid user ID format"}), 400

    transactions = Transaction.query.filter_by(user_id=user_id_int).order_by(Transaction.date.desc()).all()
    transactions_list = [
        {"id": tx.id, "name": tx.description, "amount": tx.amount, "category": tx.category, "date": tx.date.isoformat(), "type": tx.type, "is_anomaly": tx.is_anomaly}
        for tx in transactions
    ]
    return jsonify(transactions_list), 200

@app.route('/api/transactions', methods=['POST'])
@jwt_required()
def add_transaction():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'amount', 'category', 'date', 'type')):
        return jsonify({"msg": "Missing required fields"}), 400

    is_anomaly = False # Default anomaly flag

    try:
        transaction_date = date.fromisoformat(data['date'])
        amount = float(data['amount'])
        if amount <= 0:
             return jsonify({"msg": "Amount must be positive"}), 400
    except (ValueError, TypeError, KeyError):
        return jsonify({"msg": "Invalid date or amount format/type"}), 400

    try:
        user_id_int = int(user_id)
        new_transaction = Transaction(
            description=data['name'], amount=amount, category=data['category'],
            date=transaction_date, type=data['type'], user_id=user_id_int,
            is_anomaly=is_anomaly
        )
        db.session.add(new_transaction)
        db.session.commit()

        # New Anomaly Check Logic
        if new_transaction.type == 'expense':
            model = _get_or_load_model(user_id_int, 'anomaly')
            if model:
                try:
                    # Get all category columns the model was trained on
                    train_cols = model.named_steps['scaler'].feature_names_in_

                    # Create a new DataFrame for prediction with all 0s
                    df = pd.DataFrame(columns=train_cols, index=[0]).fillna(0)

                    # Set the features for the new transaction
                    df['amount'] = amount

                    # Set the one-hot encoded category
                    current_cat_col = f"category_{data['category']}"
                    if current_cat_col in df.columns:
                        df[current_cat_col] = 1

                    # Predict: -1 is an anomaly, 1 is normal
                    prediction = model.predict(df[train_cols]) # Ensure column order
                    if prediction[0] == -1:
                        is_anomaly = True
                        print(f"*** ANOMALY DETECTED for user {user_id_int}! ***")

                except Exception as e:
                    print(f"Error during anomaly prediction: {e}")
        #  END: Anomaly Check Logic 


        #  Model Invalidation Logic 
        if new_transaction.type == 'expense':
            # Invalidate both models so they retrain with new data
            for model_type in ['categorizer', 'anomaly']:
                try:
                    cache_key = f"{user_id_int}_{model_type}"
                    model_path = get_model_path(user_id_int, model_type)
                    if cache_key in user_models:
                        del user_models[cache_key] # Remove from cache
                    if os.path.exists(model_path):
                        os.remove(model_path) # Delete from disk
                    print(f"Invalidated model {cache_key} due to new expense.")
                except Exception as e:
                    print(f"Error invalidating model {model_type}: {e}")
        

    except Exception as e:
        db.session.rollback()
        print(f"Error adding transaction: {e}")
        return jsonify({"msg": "Database error saving transaction"}), 500

    return jsonify({
        "id": new_transaction.id, "name": new_transaction.description, "amount": new_transaction.amount,
        "category": new_transaction.category, "date": new_transaction.date.isoformat(), "type": new_transaction.type,
        "is_anomaly": is_anomaly  
    }), 201

@app.route('/api/transactions/<int:transaction_id>', methods=['PUT'])
@jwt_required()
def update_transaction(transaction_id):
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id_int).first()
    except ValueError:
         return jsonify({"msg": "Invalid user ID format"}), 400

    if not transaction:
        return jsonify({"msg": "Transaction not found or permission denied"}), 404
    data = request.get_json()
    if not data or not all(k in data for k in ('name', 'amount', 'category', 'date', 'type')):
        return jsonify({"msg": "Missing required fields"}), 400
    try:
        transaction.date = date.fromisoformat(data['date'])
        transaction.amount = float(data['amount'])
        if transaction.amount <= 0: return jsonify({"msg": "Amount must be positive"}), 400
    except (ValueError, TypeError, KeyError):
        return jsonify({"msg": "Invalid date or amount format/type"}), 400
    transaction.description = data['name']
    transaction.category = data['category']
    transaction.type = data['type']
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error updating transaction: {e}")
        return jsonify({"msg": "Database error updating transaction"}), 500

    return jsonify({
        "id": transaction.id, "name": transaction.description, "amount": transaction.amount,
        "category": transaction.category, "date": transaction.date.isoformat(), "type": transaction.type
    }), 200

@app.route('/api/transactions/<int:transaction_id>', methods=['DELETE'])
@jwt_required()
def delete_transaction(transaction_id):
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id_int).first()
    except ValueError:
        return jsonify({"msg": "Invalid user ID format"}), 400

    if not transaction:
        return jsonify({"msg": "Transaction not found or permission denied"}), 404
    try:
        db.session.delete(transaction)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting transaction: {e}")
        return jsonify({"msg": "Database error deleting transaction"}), 500

    return jsonify({"msg": "Transaction deleted successfully"}), 200



@app.route('/api/transactions/<int:transaction_id>/resolve', methods=['PUT'])
@jwt_required()
def resolve_anomaly(transaction_id):
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    
    try:
        user_id_int = int(user_id)
        transaction = Transaction.query.filter_by(id=transaction_id, user_id=user_id_int).first()
    except ValueError:
        return jsonify({"msg": "Invalid user ID format"}), 400

    if not transaction:
        return jsonify({"msg": "Transaction not found or permission denied"}), 404
    
    
    transaction.is_anomaly = False
    
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error resolving anomaly: {e}")
        return jsonify({"msg": "Database error"}), 500

    # Return the updated transaction
    return jsonify({
        "id": transaction.id, "name": transaction.description, "amount": transaction.amount,
        "category": transaction.category, "date": transaction.date.isoformat(), "type": transaction.type,
        "is_anomaly": transaction.is_anomaly
    }), 200
@app.route('/api/budgets', methods=['GET'])
@jwt_required()
def get_budgets():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
        budgets = Budget.query.filter_by(user_id=user_id_int).all()
        budgets_list = []
        
        
        
        today = date.today()
        start_of_month = today.replace(day=1)
        

        for budget in budgets:
            
            
            spent_result = db.session.query(func.sum(Transaction.amount))\
                .filter(
                    Transaction.user_id == user_id_int, 
                    Transaction.category == budget.category, 
                    Transaction.type == 'expense',
                    Transaction.date >= start_of_month  
                )\
                .scalar()
            
            
            current_spent = spent_result or 0.0

            
            status = "on_track"
            if budget.total_amount > 0:
                _, days_in_month = calendar.monthrange(today.year, today.month)
                percent_of_month = today.day / float(days_in_month)
                percent_spent = current_spent / float(budget.total_amount)

                if percent_spent > 1:
                    status = "over"
                elif percent_spent > percent_of_month:
                    status = "at_risk"
            elif current_spent > 0 and budget.total_amount <= 0:
                status = "over"
            
            if current_spent > budget.total_amount and budget.total_amount > 0:
                 status = "over"

            budgets_list.append({
                "id": budget.id, 
                "name": budget.category, 
                "total": budget.total_amount, 
                "current": current_spent,
                "status": status
            })
    except ValueError:
        return jsonify({"msg": "Invalid user ID format"}), 400
    except Exception as e:
        print(f"Error getting budgets: {e}")
        return jsonify({"msg": "Error retrieving budgets"}), 500
    return jsonify(budgets_list), 200

@app.route('/api/budgets', methods=['POST'])
@jwt_required()
def add_budget():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    data = request.get_json()
    category = data.get('category')
    amount = data.get('amount')
    if not data or not category or amount is None: return jsonify({"msg": "Missing category or amount"}), 400
    try:
        user_id_int = int(user_id)
        if Budget.query.filter_by(user_id=user_id_int, category=category).first(): return jsonify({"msg": f"Budget for '{category}' already exists"}), 400
        total_amount = float(amount)
        if total_amount <= 0: raise ValueError("Amount must be positive")
    except (ValueError, TypeError): return jsonify({"msg": "Invalid amount provided"}), 400

    new_budget = Budget(category=category, total_amount=total_amount, user_id=user_id_int)
    try:
        db.session.add(new_budget)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error adding budget: {e}")
        return jsonify({"msg": "Database error saving budget"}), 500
    return jsonify({"id": new_budget.id, "name": new_budget.category, "total": new_budget.total_amount, "current": 0.0}), 201

@app.route('/api/budgets/<int:budget_id>', methods=['PUT'])
@jwt_required()
def update_budget(budget_id):
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id_int).first()
    except ValueError:
        return jsonify({"msg": "Invalid user ID format"}), 400

    if not budget: return jsonify({"msg": "Budget not found or permission denied"}), 404
    data = request.get_json()
    new_amount = data.get('amount')
    if new_amount is None: return jsonify({"msg": "Missing amount"}), 400
    try:
        total_amount = float(new_amount)
        if total_amount <= 0: raise ValueError("Amount must be positive")
    except (ValueError, TypeError): return jsonify({"msg": "Invalid amount provided"}), 400
    budget.total_amount = total_amount
    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error updating budget: {e}")
        return jsonify({"msg": "Database error updating budget"}), 500

    # Recalculate spent for response consistency
    spent_result = db.session.query(func.sum(Transaction.amount))\
        .filter(Transaction.user_id == user_id_int, Transaction.category == budget.category, Transaction.type == 'expense')\
        .scalar()
    current_spent = spent_result or 0.0
    return jsonify({"id": budget.id, "name": budget.category, "total": budget.total_amount, "current": current_spent}), 200

@app.route('/api/budgets/<int:budget_id>', methods=['DELETE'])
@jwt_required()
def delete_budget(budget_id):
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
        budget = Budget.query.filter_by(id=budget_id, user_id=user_id_int).first()
    except ValueError:
        return jsonify({"msg": "Invalid user ID format"}), 400

    if not budget: return jsonify({"msg": "Budget not found or permission denied"}), 404
    try:
        db.session.delete(budget)
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting budget: {e}")
        return jsonify({"msg": "Database error deleting budget"}), 500
    return jsonify({"msg": "Budget deleted successfully"}), 200
@app.route('/api/predict/category', methods=['POST'])
@jwt_required()
def predict_category():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401

    data = request.get_json()
    description = data.get('description')
    if not description:
        return jsonify({"msg": "Missing description"}), 400

    try:
        user_id_int = int(user_id)

        # Get the categorizer model
        model = _get_or_load_model(user_id_int, 'categorizer') 

        if model is None:
            print(f"No categorizer model available for user {user_id_int}. Cannot predict.")
            return jsonify({"category": None}), 200 

        # Run the prediction
        prediction = model.predict([description])
        predicted_category = prediction[0]
        print(f"Prediction for '{description}': {predicted_category}")

        return jsonify({"category": predicted_category}), 200

    except Exception as e:
        print(f"Error during prediction: {e}")
        return jsonify({"msg": "Error processing prediction"}), 500
#Analytics Endpoint 

@app.route('/api/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    user_id = get_jwt_identity()
    if not user_id: return jsonify({"msg":"Invalid user identity"}), 401
    try:
        user_id_int = int(user_id)
        # Get ALL transactions for charts
        all_transactions = Transaction.query.filter_by(user_id=user_id_int).order_by(Transaction.date.asc()).all()
        budgets = Budget.query.filter_by(user_id=user_id_int).all()
        
        #  MONTHLY-ONLY LOGIC 
        today = date.today()
        start_of_month = today.replace(day=1)
        
        # Get transactions for THIS MONTH ONLY (for Smart Tips)
        monthly_transactions = [t for t in all_transactions if t.date >= start_of_month]
        

    except ValueError:
         return jsonify({"msg": "Invalid user ID format"}), 400
    except Exception as e:
         print(f"Error fetching analytics data: {e}")
         return jsonify({"msg": "Error fetching data for analytics"}), 500

    # HISTORICAL Stats (for charts) 
    total_income = sum(t.amount for t in all_transactions if t.type == 'income')
    total_spent = sum(t.amount for t in all_transactions if t.type == 'expense')
    net_savings = total_income - total_spent 
    avg_daily = 0.0
    days_span = 0
    if all_transactions:
        valid_dates = [t.date for t in all_transactions if isinstance(t.date, date)]
        if valid_dates:
            first_date = min(valid_dates)
            last_date = max(valid_dates)
            days_span = (last_date - first_date).days + 1
            if days_span > 0:
                avg_daily = total_spent / days_span

    # HISTORICAL Chart Data (for charts) 
    spending_by_category = defaultdict(float) # HISTORICAL spending
    income_sources = defaultdict(float)
    monthly_summary = defaultdict(lambda: {"income": 0.0, "expense": 0.0})
    
    #  7-DAY and MONTHLY-ONLY LOGIC ---
    seven_days_ago = today - timedelta(days=6)
    daily_spending = { (seven_days_ago + timedelta(days=i)): 0.0 for i in range(7) }
    daily_income = { (seven_days_ago + timedelta(days=i)): 0.0 for i in range(7) }
    
    #  Dictionaries for CURRENT MONTH ONLY
    monthly_spending_by_category = defaultdict(float)
    monthly_income_sources = defaultdict(float)
    monthly_total_income = 0.0
    monthly_total_spent = 0.0
    

    for t in all_transactions: # Loop through ALL transactions
        if isinstance(t.date, date):
            # Logic for CURRENT MONTH (for Smart Tips)
            if t.date >= start_of_month:
                if t.type == 'expense':
                    monthly_total_spent += t.amount
                    monthly_spending_by_category[t.category] += t.amount
                elif t.type == 'income':
                    monthly_total_income += t.amount
                    monthly_income_sources[t.category] += t.amount

            # Logic for HISTORICAL (for Charts)
            if t.type == 'expense':
                spending_by_category[t.category] += t.amount # Add to historical
                if seven_days_ago <= t.date <= today:
                     if t.date in daily_spending:
                         daily_spending[t.date] += t.amount
            elif t.type == 'income':
                income_sources[t.category] += t.amount # Add to historical
                if seven_days_ago <= t.date <= today:
                    if t.date in daily_income:
                        daily_income[t.date] += t.amount
                
            try:
                month_str = t.date.strftime('%Y-%m')
                monthly_summary[month_str][t.type] += t.amount
            except AttributeError:
                 print(f"Warning: Transaction ID {t.id} has invalid date format: {t.date}")
        else:
            print(f"Warning: Transaction ID {t.id} has invalid date type: {type(t.date)}, value: {t.date}")

    
    category_donut = {"labels": list(spending_by_category.keys()), "values": list(spending_by_category.values())}
    income_pie = {"labels": list(income_sources.keys()), "values": list(income_sources.values())}
    budget_radar = {"labels": [b.category for b in budgets], "budgeted": [b.total_amount for b in budgets], "spent": [monthly_spending_by_category.get(b.category, 0.0) for b in budgets]} # <-- This now uses MONTHLY spending
    
    sorted_daily_spending = sorted(daily_spending.items())
    daily_bar = {"labels": [d.strftime('%a') for d, _ in sorted_daily_spending], "values": [amount for _, amount in sorted_daily_spending]}
    
    sorted_daily_income = sorted(daily_income.items())
    main_line_weekly = {
        'labels': [d.strftime('%a') for d, _ in sorted_daily_spending],
        'income': [amount for _, amount in sorted_daily_income],
        'expense': [amount for _, amount in sorted_daily_spending]
    }
    
    sorted_months = sorted(monthly_summary.keys())
    main_line_monthly = {'labels': [datetime.strptime(m, '%Y-%m').strftime('%b') for m in sorted_months], 'income': [monthly_summary[m]["income"] for m in sorted_months], 'expense': [monthly_summary[m]["expense"] for m in sorted_months]}
    main_line = {'monthly': main_line_monthly, 'weekly': main_line_weekly}

    
    # Smart Tips Logic
    
    smart_tips = []
    
    # Tip 1: Savings analysis for THIS MONTH
    monthly_net_savings = monthly_total_income - monthly_total_spent
    monthly_category_donut = {"labels": list(monthly_spending_by_category.keys()), "values": list(monthly_spending_by_category.values())}
    if monthly_net_savings > 0:
        smart_tips.append(f"Great job! You've saved KSh {monthly_net_savings:,.2f} this month.")
    else:
        smart_tips.append(f"Your spending of KSh {monthly_total_spent:,.2f} has exceeded your income this month.")

    # Tip 2: Highest spending category for THIS MONTH
    if monthly_spending_by_category:
        highest_category = max(monthly_spending_by_category, key=monthly_spending_by_category.get)
        highest_amount = monthly_spending_by_category[highest_category]
        smart_tips.append(f"Your top spending category this month is '{highest_category}' at KSh {highest_amount:,.2f}.")

    # Tip 3: Average daily spending 
    if avg_daily > 0:
        smart_tips.append(f"You spend an average of KSh {avg_daily:,.2f} per day historically.")

    # Tip 4: Budget status for THIS MONTH
    if budgets:
        at_risk_budget = None
        for b in budgets:
            # Use this month's spending for the check
            budget_spent_this_month = monthly_spending_by_category.get(b.category, 0.0)
            if b.total_amount > 0 and (budget_spent_this_month / b.total_amount) > 0.8:
                at_risk_budget = b
                break
        if at_risk_budget:
            smart_tips.append(f"Watch out: You've spent over 80% of your '{at_risk_budget.category}' budget this month.")
    
    if not smart_tips:
        smart_tips.append("Add more transactions to get personalized tips!")
    
    monthly_income_pie = {"labels": list(monthly_income_sources.keys()), "values": list(monthly_income_sources.values())}

    # Assemble response
    return jsonify({
        
        "stats": {
            "totalIncome": monthly_total_income, 
            "totalSpent": monthly_total_spent, 
            "netSavings": monthly_net_savings, 
            "avgDaily": avg_daily # Avg daily (historical) 
        },
        # We are sending the MONTHLY donut chart data
        "charts": {
            "mainLine": main_line, 
            "categoryDonut": monthly_category_donut, 
            "dailyBar": daily_bar, 
            "budgetRadar": budget_radar, 
            "incomePie": monthly_income_pie
        },
        "smart_tips": smart_tips
    }), 200


#  Settings/Profile Endpoints 

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user = get_current_user_object()
    if not user: return jsonify({"msg": "User not found"}), 404

    data = request.get_json()
    new_name = data.get('name')
    new_avatar = data.get('avatar') 

    if new_name and len(new_name) >= 2:
        user.name = new_name
    
    if new_avatar:
        
        if new_avatar.startswith('data:image'):
            user.avatar_url = new_avatar

    try:
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error updating profile: {e}")
        return jsonify({"msg": "Database error"}), 500

    return jsonify({
        "name": user.name,
        "email": user.email,
        "avatar": user.avatar_url,
        "theme": user.theme,
        "accent_color": user.accent_color
    }), 200

@app.route('/api/password', methods=['PUT'])
@jwt_required()
def update_password():
    user = get_current_user_object()
    if not user: return jsonify({"msg": "User not found"}), 404

    data = request.get_json()
    if not data: return jsonify({"msg": "Missing request data"}), 400
    current_password = data.get('currentPassword')
    new_password = data.get('newPassword')
    confirm_password = data.get('confirmPassword')

    if not current_password or not new_password or not confirm_password:
        return jsonify({"msg": "Missing password fields"}), 400
    if not bcrypt.check_password_hash(user.password_hash, current_password):
        return jsonify({"msg": "Incorrect current password"}), 401 
    if new_password != confirm_password:
        return jsonify({"msg": "New passwords do not match"}), 400
    if len(new_password) < 6:
         return jsonify({"msg": "Password must be at least 6 characters"}), 400

    try:
        user.password_hash = bcrypt.generate_password_hash(new_password).decode('utf-8')
        db.session.commit()
    except Exception as e:
        db.session.rollback()
        print(f"Error updating password: {e}")
        return jsonify({"msg": "Database error updating password"}), 500

    return jsonify({"msg": "Password updated successfully"}), 200

@app.route('/api/settings', methods=['PUT'])
@jwt_required()
def update_settings():
    user = get_current_user_object()
    if not user: return jsonify({"msg": "User not found"}), 404

    data = request.get_json()
    if not data: return jsonify({"msg": "Missing request data"}), 400
    
    new_theme = data.get('theme')
    new_accent = data.get('accent_color')
    updated = False 

    # 1. Appearance
    if new_theme and new_theme in ['light', 'dark'] and user.theme != new_theme:
        user.theme = new_theme
        updated = True
    
    if new_accent and new_accent.startswith('#') and (len(new_accent) == 7 or len(new_accent) == 4) and user.accent_color != new_accent:
        user.accent_color = new_accent
        updated = True

    # 2. Notifications 
    if 'notifySummary' in data:
         val = bool(data['notifySummary'])
         if user.notify_summary != val:
             user.notify_summary = val
             updated = True

    if 'notifyAlerts' in data:
         val = bool(data['notifyAlerts'])
         if user.notify_alerts != val:
             user.notify_alerts = val
             updated = True

    if 'notifyUpdates' in data:
         val = bool(data['notifyUpdates'])
         if user.notify_updates != val:
             user.notify_updates = val
             updated = True

    # 3. Commit
    if updated:
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error updating settings: {e}")
            return jsonify({"msg": "Database error updating settings"}), 500
    
    return jsonify({
         "theme": user.theme,
         "accent_color": user.accent_color,
         # Return the new values to the frontend
         "notifySummary": user.notify_summary,
         "notifyAlerts": user.notify_alerts,
         "notifyUpdates": user.notify_updates
    }), 200




@app.route('/api/debug/seed-data', methods=['GET'])
@jwt_required()
def seed_data():
    """
    TEMPORARY: Wipes transactions AND budgets, then seeds 
    6 months of fake data from seed_data.csv and creates
    a matching set of budgets.
    """
    user_id = int(get_jwt_identity())
    csv_file_path = os.path.join(app.root_path, 'seed_data.csv')

    if not os.path.exists(csv_file_path):
        print(f"Error: seed_data.csv not found at {csv_file_path}")
        return jsonify({"msg": "Error: seed_data.csv not found."}), 404

    # 1. Wipe all old transactions AND budgets for this user
    try:
        Transaction.query.filter_by(user_id=user_id).delete()
        Budget.query.filter_by(user_id=user_id).delete() # <-- NEW
        db.session.commit()
        print(f"--- Wiped old data for user {user_id} ---")
    except Exception as e:
        db.session.rollback()
        return jsonify({"msg": f"Error wiping data: {e}"}), 500

    # 2. Read the CSV and generate new data
    try:
        new_transactions = []
        with open(csv_file_path, mode='r', encoding='utf-8-sig') as file:
            reader = csv.DictReader(file)
            for row in reader:
                try:
                    new_tx = Transaction(
                        description=row['description'],
                        amount=float(row['amount']),
                        category=row['category'],
                        date=date.fromisoformat(row['date']),
                        type=row['type'],
                        user_id=user_id
                    )
                    new_transactions.append(new_tx)
                except Exception as parse_error:
                    print(f"Skipping row due to error: {parse_error}. Row: {row}")
        
        db.session.add_all(new_transactions)
        
        
        print("--- Seeding new budgets ---")
        # Create a list of budgets 
        new_budgets = [
            Budget(category='food', total_amount=8000, user_id=user_id),
            Budget(category='transport', total_amount=2000, user_id=user_id),
            Budget(category='rent', total_amount=6000, user_id=user_id),
            Budget(category='utilities', total_amount=2500, user_id=user_id),
            Budget(category='shopping', total_amount=3000, user_id=user_id),
            Budget(category='other', total_amount=1000, user_id=user_id)
        ]
        db.session.add_all(new_budgets)
        

        db.session.commit()
        print(f"--- Seeded {len(new_transactions)} transactions and {len(new_budgets)} budgets ---")
        
        # Invalidate all AI models so they retrain
        for model_type in ['categorizer', 'anomaly']:
            cache_key = f"{user_id}_{model_type}"
            model_path = get_model_path(user_id, model_type)
            if cache_key in user_models: del user_models[cache_key]
            if os.path.exists(model_path): os.remove(model_path)
            print(f"Invalidated model {model_type} after seeding.")
        
        return jsonify({"msg": f"Successfully seeded {len(new_transactions)} transactions and {len(new_budgets)} budgets."}), 200

    except Exception as e:
        db.session.rollback()
        print(f"Error seeding data: {e}")
        return jsonify({"msg": f"Error seeding data: {e}"}), 500


@app.route('/api/forecast/balance', methods=['GET'])
@jwt_required()
def get_balance_forecast():
    user_id = int(get_jwt_identity())

    try:
        # 1. Get all transactions to find patterns
        transactions = Transaction.query.filter_by(user_id=user_id).order_by(Transaction.date.asc()).all()

        if not transactions or len(transactions) < 10: # Need some data
            return jsonify({"status": "insufficient_data", "data": []}), 200

        # 2. Process data with Pandas
        data = []
        current_balance = 0.0
        for t in transactions:
            amount = t.amount if t.type == 'income' else -t.amount
            data.append({'date': t.date, 'amount': amount})
            current_balance += amount
        
        df = pd.DataFrame(data)
        df['date'] = pd.to_datetime(df['date'])
        
        
        
        df_monthly = df.groupby('date').sum().resample('ME').sum()
        
        series = df_monthly['amount']
        

        # 3. Train the AI (ARIMA Model)
        
        print("--- Training MONTHLY forecast model... ---")
        model = ARIMA(series, order=(1,1,1)) # (p=1, d=1, q=1)
        model_fit = model.fit()
        print("--- Model trained. Forecasting... ---")

        # 4. Forecast the next 6 MONTHS
        forecast_result = model_fit.forecast(steps=6)
        
        # 5. Convert forecast into a list of dates and balances
        forecast_data = []
        running_balance = current_balance

        for i in range(len(forecast_result)):
            # Get the month label (e.g., "2025-12")
            month_label = forecast_result.index[i].strftime('%b') 
            predicted_net_flow = forecast_result.iloc[i]
            running_balance += predicted_net_flow
            
            forecast_data.append({
                "date": month_label, # e.g., "2025-12"
                "balance": round(running_balance, 2)
            })

        print("--- Forecast complete. ---")
        return jsonify({"status": "ok", "data": forecast_data}), 200

    except Exception as e:
        print(f"Error during forecasting: {e}")
        # This can happen if the data is not good for forecasting
        return jsonify({"status": "error", "message": str(e)}), 500

    except Exception as e:
        print(f"Error during forecasting: {e}")
        # This can happen if the data is not good for forecasting
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/api/chat', methods=['POST'])
@jwt_required()
def handle_chat():
    # We get the key inside the function now
    GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY')
    if not GEMINI_API_KEY:
        return jsonify({"answer": "Chatbot is not configured. Missing API key."}), 500

    user_id = int(get_jwt_identity())
    data = request.get_json()
    user_question = data.get('query')

    if not user_question:
        return jsonify({"msg": "Missing query"}), 400

    try:
        # 1. Get User's Data as Context 
        thirty_days_ago = date.today() - timedelta(days=30)
        transactions = Transaction.query.filter(
            Transaction.user_id == user_id,
            Transaction.date >= thirty_days_ago
        ).order_by(Transaction.date.desc()).all()

        transaction_context = []
        if not transactions:
            transaction_context.append("User has no transactions in the last 30 days.")
        else:
            for t in transactions:
                transaction_context.append(f"{t.date.isoformat()}: {t.description} ({t.category}) - KSh {t.amount:,.2f} ({t.type})")

        context_string = "\n".join(transaction_context)

        # 2. Create the Prompt
        prompt = f"""
        You are "FinTrack AI," a helpful and friendly financial assistant. 
        You are speaking to a user about their finances.
        Today's date is {date.today().isoformat()}.

        Here is the user's transaction history for the last 30 days:
        ---
        {context_string}
        ---

        The user asked this question:
        "{user_question}"

        Based ONLY on the transaction history provided, answer the user's question. 
        - If the user asks for a total, calculate it from the data.
        - If the user asks for a list, list them.
        - Be concise and friendly.
        - If the answer is not in the transaction history, say "I don't have that information in your recent history."
        """

        # 3. Call the Gemini API directly with 'requests'
        
        url = f"https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key={GEMINI_API_KEY}"

        # This is the required JSON payload for the new API
        payload = {
            "contents": [
                {
                    "parts": [
                        {"text": prompt}
                    ]
                }
            ]
        }

        headers = {"Content-Type": "application/json"}

        # Make the web request
        api_response = requests.post(url, headers=headers, json=payload)

        if api_response.status_code != 200:
            # If the API itself errors, show that
            print(f"Gemini API Error: {api_response.text}")
            raise Exception(f"Gemini API returned status {api_response.status_code}")

        response_data = api_response.json()

        # 4. Extract and Return the AI's answer
        
        ai_answer = response_data['candidates'][0]['content']['parts'][0]['text']

        return jsonify({"answer": ai_answer}), 200

    except Exception as e:
        print(f"Error in chat endpoint: {e}")
        return jsonify({"answer": "Sorry, I ran into an error trying to answer that."}), 500
@app.route('/api/export/csv', methods=['GET'])
@jwt_required()
def export_csv():
    user = get_current_user_object()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    # 1. Fetch all transactions for the user
    transactions = Transaction.query.filter_by(user_id=user.id).order_by(Transaction.date.desc()).all()
    
    # 2. Create a CSV in memory using a string buffer
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write the header row
    writer.writerow(['Date', 'Description', 'Category', 'Amount', 'Type', 'Is Anomaly'])
    
    # Write the transaction data
    for tx in transactions:
        writer.writerow([
            tx.date, 
            tx.description, 
            tx.category, 
            tx.amount, 
            tx.type, 
            'Yes' if tx.is_anomaly else 'No'
        ])
    
    # 3. Create the response object with CSV headers
    response = make_response(output.getvalue())
    response.headers["Content-Disposition"] = "attachment; filename=fintrack_export.csv"
    response.headers["Content-type"] = "text/csv"
    
    return response

@app.route('/api/account', methods=['DELETE'])
@jwt_required()
def delete_account():
    user = get_current_user_object()
    if not user:
        return jsonify({"msg": "User not found"}), 404

    try:
        # 1. Delete all associated transactions and budgets first
        Transaction.query.filter_by(user_id=user.id).delete()
        Budget.query.filter_by(user_id=user.id).delete()
        
        # 2. Delete the user record itself
        db.session.delete(user)
        db.session.commit()
        return jsonify({"msg": "Account and all data deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        print(f"Error deleting account: {e}")
        return jsonify({"msg": "Database error during account deletion"}), 500
#Main execution 
if __name__ == '__main__':
    
    with app.app_context():
        # Check if the database file exists before creating tables
        
        db_file_exists = os.path.exists(db_path)
        if not db_file_exists:
             print("Database file not found, creating tables...")
             try:
                 db.create_all() # Creates tables if they don't exist based on models
                 print("Tables created.")
             except Exception as e:
                 print(f"Error creating tables: {e}")
        else:
             print("Database file found.")
            
             try:
                 
                 _ = User.query.with_entities(User.theme, User.accent_color).first()
                 print("Schema seems up-to-date (basic check).")
             except Exception as e:
                 print(f"!!! Database schema might be outdated: {e} !!!")
                 print(f"!!! Consider deleting '{db_path}' and restarting the app. !!!")


    # Start the server
    print("Starting Flask server...")
    
    
    app.run(debug=True, host='0.0.0.0', port=5000)

