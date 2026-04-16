from app.db.session import SessionLocal
from app.models.ledger import SystemConfig

def save_minimax_key():
    db = SessionLocal()
    try:
        key_val = 'sk-api-lP0o87Y0JDMSWS79RP5S-0pQWyOmRN47PRARkz1bJeL6IFa4QggDw0G3oqhwZ1nR6jTgn90TKJYGRdSNJ5KMndR-ZC8h3NPsaBtuiDkrb2rd1uWd1bTL7Zs'
        config = db.query(SystemConfig).filter_by(key='MINIMAX_API_KEY').first()
        if not config:
            db.add(SystemConfig(key='MINIMAX_API_KEY', value=key_val, description='MiniMax API Key'))
        else:
            config.value = key_val
        db.commit()
        print('✅ MiniMax API Key saved to SystemConfig')
    finally:
        db.close()

if __name__ == "__main__":
    save_minimax_key()
