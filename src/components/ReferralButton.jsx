import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import './ReferralButton.css';

const ReferralButton = ({ telegramId, username, referralCode, botUsername }) => {
    const [showPanel, setShowPanel] = useState(false);
    const [copied, setCopied] = useState(false);

    const getReferralLink = () => {
        const targetBotUsername = botUsername || process.env.REACT_APP_BOT_USERNAME || 'your_bot';
        return `https://t.me/${targetBotUsername}?start=${referralCode}`;
    };

    const copyToClipboard = async (text) => {
        try {
            if (window.Telegram?.WebApp) {
                const tg = window.Telegram.WebApp;
                if (tg.openLink) {
                    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(text)}&text=${encodeURIComponent('Присоединяйтесь к игре! 🎮')}`;
                    tg.openLink(shareUrl);
                    return;
                }
            }

            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            console.error('[Referral] Error copying:', error);
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const shareOnTelegram = () => {
        const link = getReferralLink();
        if (window.Telegram?.WebApp) {
            const tg = window.Telegram.WebApp;
            const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent('🎮 Присоединяйтесь к MVP Runner! Получите 300 монет при первой игре!')}`;
            tg.openLink(shareUrl);
        } else {
            copyToClipboard(link);
        }
    };

    const isLoading = !referralCode && telegramId;

    const handleButtonClick = () => {

        setShowPanel(!showPanel);
    };

    return (
        <div className="referral-button-container">
            <button
                className="header-icon-btn"
                onClick={handleButtonClick}
                title="Реферальная программа"
                style={{ position: 'relative', zIndex: 1 }}
            >
                {isLoading ? '⏳' : '👥'}
            </button>

            {showPanel && ReactDOM.createPortal(
                <>
                    <div className="referral-overlay" onClick={() => setShowPanel(false)} style={{ zIndex: 99999 }} />
                    <div className="referral-panel" style={{ zIndex: 100000 }}>
                        <div className="referral-header">
                            <h3>Пригласить друзей</h3>
                            <button className="close-btn" onClick={() => setShowPanel(false)}>✕</button>
                        </div>

                        <div className="referral-content">
                            {!referralCode ? (
                                <div style={{ textAlign: 'center', padding: '40px 20px', color: 'rgba(255, 255, 255, 0.6)' }}>
                                    <div style={{ fontSize: '24px', marginBottom: '10px' }}>⏳</div>
                                    <div>Загрузка реферального кода...</div>
                                </div>
                            ) : (
                                <>
                                    <div className="referral-info">
                                        <div className="info-item">
                                            <span className="info-icon">🎁</span>
                                            <div className="info-text">
                                                <div className="info-title">Друг получает</div>
                                                <div className="info-value">300 монет</div>
                                            </div>
                                        </div>
                                        <div className="info-item">
                                            <span className="info-icon">💰</span>
                                            <div className="info-text">
                                                <div className="info-title">Вы получаете</div>
                                                <div className="info-value">150 монет</div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="referral-link-section">
                                        <div className="link-label">Ваша реферальная ссылка</div>
                                        <div className="link-display">
                                            <input type="text" value={getReferralLink()} readOnly className="link-input" />
                                            <button className="copy-link-btn" onClick={() => copyToClipboard(getReferralLink())}>
                                                {copied ? '✓ Скопировано' : 'Копировать'}
                                            </button>
                                        </div>
                                    </div>

                                    <button className="share-telegram-btn" onClick={shareOnTelegram}>
                                        <span className="telegram-icon">✈️</span>
                                        Поделиться в Telegram
                                    </button>

                                    <div className="referral-description">
                                        Пригласите друзей и получайте 150 монет за каждого, кто сыграет первую игру!
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </>,
                document.body
            )}
        </div>
    );
};

export default ReferralButton;
