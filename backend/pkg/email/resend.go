package email

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math/big"
	"net/http"
	"os"
	"time"
)

// GenerateOTP produces a cryptographically secure 6-digit numeric string
func GenerateOTP() (string, error) {
	n, err := rand.Int(rand.Reader, big.NewInt(900000))
	if err != nil {
		return "", err
	}
	return fmt.Sprintf("%06d", n.Int64()+100000), nil
}

type ResendEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	ReplyTo string   `json:"reply_to,omitempty"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

type ResendEmailResponse struct {
	ID    string `json:"id,omitempty"`
	Error *struct {
		Message string `json:"message"`
		Name    string `json:"name"`
	} `json:"error,omitempty"`
}

// SendVerificationEmail dispatches a 6-digit OTP using the Resend API
func SendVerificationEmail(recipientEmail, username, otp string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	replyTo := os.Getenv("RESEND_REPLY_TO")

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E0D8; margin: 0; padding: 24px; }
    .card { max-width: 540px; margin: 0 auto; background: linear-gradient(145deg, #181412 0%%, #0D0B0A 100%%); border: 1px solid rgba(212, 175, 55, 0.3); border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.8); }
    .logo { text-align: center; margin-bottom: 24px; }
    .brand { font-family: 'Georgia', serif; font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #F5D061; text-transform: uppercase; }
    .tag { font-family: monospace; font-size: 11px; letter-spacing: 1px; color: #EF4444; margin-top: 4px; }
    h1 { font-family: 'Georgia', serif; font-size: 24px; color: #FFFFFF; text-align: center; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #B8B2A6; margin: 0 0 20px 0; }
    .otp-box { background: #080706; border: 1px solid rgba(212, 175, 55, 0.5); border-radius: 12px; padding: 18px; text-align: center; margin: 28px 0; box-shadow: inset 0 0 20px rgba(212, 175, 55, 0.1); }
    .otp-code { font-family: monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #F5D061; }
    .footer { font-size: 11px; font-family: monospace; color: #736B5E; text-align: center; border-top: 1px solid #241E19; padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="brand">THE DARKHOLD EXCHANGE</div>
      <div class="tag">HIGH-FREQUENCY SECONDARY MARKETPLACE // PS-07</div>
    </div>
    <h1>Verify Your Identity</h1>
    <p>Greetings <strong>%s</strong>,</p>
    <p>Your portal to the secondary order book and anti-scalper trading engine is almost ready. Use the 6-digit arcane one-time verification code below to confirm your email:</p>
    
    <div class="otp-box">
      <div class="otp-code">%s</div>
    </div>
    
    <p style="font-size: 13px; color: #D4AF37;">⏳ This code expires in <strong>15 minutes</strong>. If you did not initiate this request, no action is required.</p>
    
    <div class="footer">
      Automated dispatch from The Darkhold Exchange Protocol.<br/>
      Double-entry ledger & in-memory matching verified.
    </div>
  </div>
</body>
</html>
`, username, otp)

	reqBody := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{recipientEmail},
		ReplyTo: replyTo,
		Subject: fmt.Sprintf("%s is your Darkhold Exchange verification code", otp),
		HTML:    htmlContent,
	}

	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to dispatch Resend email: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var resendErr ResendEmailResponse
		_ = json.Unmarshal(bodyBytes, &resendErr)
		errMsg := string(bodyBytes)
		if resendErr.Error != nil {
			errMsg = resendErr.Error.Message
		}
		log.Printf("⚠️  [Resend API Error] Status %d: %s", resp.StatusCode, errMsg)
		return fmt.Errorf("resend error (%d): %s", resp.StatusCode, errMsg)
	}

	log.Printf("📧 [Email Dispatched] Sent OTP verification to %s via Resend", recipientEmail)
	return nil
}

// SendKYCApprovedEmail notifies the user that their government identity verification has been approved
func SendKYCApprovedEmail(recipientEmail, username string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	replyTo := os.Getenv("RESEND_REPLY_TO")

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E0D8; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: linear-gradient(145deg, #181412 0%%, #0D0B0A 100%%); border: 1px solid rgba(34, 197, 94, 0.4); border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.85); }
    .logo { text-align: center; margin-bottom: 24px; }
    .brand { font-family: 'Georgia', serif; font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #F5D061; text-transform: uppercase; }
    .tag { font-family: monospace; font-size: 11px; letter-spacing: 1px; color: #22C55E; margin-top: 4px; }
    h1 { font-family: 'Georgia', serif; font-size: 24px; color: #FFFFFF; text-align: center; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #B8B2A6; margin: 0 0 20px 0; }
    .status-box { background: rgba(34, 197, 94, 0.1); border: 1px solid rgba(34, 197, 94, 0.5); border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
    .status-badge { font-family: monospace; font-size: 18px; font-weight: 800; letter-spacing: 3px; color: #86EFAC; text-transform: uppercase; }
    .status-sub { font-size: 12px; color: #A8C7AF; font-family: monospace; margin-top: 6px; }
    .cta-btn { display: inline-block; background: linear-gradient(90deg, #D4AF37 0%%, #F5D061 100%%); color: #080706; text-decoration: none; font-weight: 800; font-family: monospace; font-size: 13px; letter-spacing: 1px; padding: 14px 28px; border-radius: 10px; text-transform: uppercase; margin: 10px 0; }
    .footer { font-size: 11px; font-family: monospace; color: #736B5E; text-align: center; border-top: 1px solid #241E19; padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="brand">THE DARKHOLD EXCHANGE</div>
      <div class="tag">COMPLIANCE // VERIFICATION APPROVED</div>
    </div>
    <h1>Identity Verified</h1>
    <p>Greetings <strong>%s</strong>,</p>
    <p>We are pleased to inform you that your government identity proof has been reviewed and <strong>approved</strong> by Darkhold Compliance Administration.</p>
    
    <div class="status-box">
      <div class="status-badge">🛡️ STATUS: VERIFIED</div>
      <div class="status-sub">FULL ESCROW & SECONDARY ORDERBOOK PRIVILEGES ACTIVATED</div>
    </div>
    
    <p>You now have unrestricted access to atomic settlement, sub-10ms Go FIFO matching, and dynamic anti-scalper collar orders.</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="http://localhost:5173/dashboard" class="cta-btn">Access Trading Dashboard &rarr;</a>
    </div>
    
    <div class="footer">
      Darkhold Compliance Protocol &middot; Cryptographic Double-Entry Ledger<br/>
      Official administrative notification.
    </div>
  </div>
</body>
</html>
`, username)

	reqBody := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{recipientEmail},
		ReplyTo: replyTo,
		Subject: "🎉 Identity Verified: Dark Pool Access Granted — The Darkhold Exchange",
		HTML:    htmlContent,
	}

	return dispatchResendEmail(apiKey, reqBody, "KYC Approval", recipientEmail)
}

// SendKYCRejectedEmail notifies the user that their government identity verification was rejected
func SendKYCRejectedEmail(recipientEmail, username, reason string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	replyTo := os.Getenv("RESEND_REPLY_TO")

	if reason == "" {
		reason = "Government ID proof could not be verified. Please submit a clearer or alternate valid document."
	}

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E0D8; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: linear-gradient(145deg, #181412 0%%, #0D0B0A 100%%); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.85); }
    .logo { text-align: center; margin-bottom: 24px; }
    .brand { font-family: 'Georgia', serif; font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #F5D061; text-transform: uppercase; }
    .tag { font-family: monospace; font-size: 11px; letter-spacing: 1px; color: #EF4444; margin-top: 4px; }
    h1 { font-family: 'Georgia', serif; font-size: 24px; color: #FFFFFF; text-align: center; margin: 0 0 12px 0; }
    p { font-size: 14px; line-height: 1.6; color: #B8B2A6; margin: 0 0 20px 0; }
    .reason-box { background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 12px; padding: 18px 20px; margin: 24px 0; }
    .reason-title { font-family: monospace; font-size: 11px; font-weight: 800; letter-spacing: 1px; color: #F87171; text-transform: uppercase; margin-bottom: 6px; }
    .reason-text { font-family: monospace; font-size: 13px; color: #FCA5A5; line-height: 1.5; }
    .cta-btn { display: inline-block; background: linear-gradient(90deg, #EA580C 0%%, #F59E0B 100%%); color: #080706; text-decoration: none; font-weight: 800; font-family: monospace; font-size: 13px; letter-spacing: 1px; padding: 14px 28px; border-radius: 10px; text-transform: uppercase; margin: 10px 0; }
    .footer { font-size: 11px; font-family: monospace; color: #736B5E; text-align: center; border-top: 1px solid #241E19; padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="brand">THE DARKHOLD EXCHANGE</div>
      <div class="tag">COMPLIANCE // VERIFICATION NOTICE</div>
    </div>
    <h1>Identity Verification Update</h1>
    <p>Greetings <strong>%s</strong>,</p>
    <p>Our compliance administrators reviewed your submitted identity verification. Unfortunately, your submission could not be approved at this time.</p>
    
    <div class="reason-box">
      <div class="reason-title">REASON FOR REJECTION:</div>
      <div class="reason-text">%s</div>
    </div>
    
    <p>Please log in to your dashboard to review your submission and provide an updated, clear government ID (Passport, National ID, or Driving License).</p>

    <div style="text-align: center; margin: 24px 0;">
      <a href="http://localhost:5173/dashboard" class="cta-btn">Resubmit Identity Proof &rarr;</a>
    </div>
    
    <div class="footer">
      Darkhold Compliance Protocol &middot; Cryptographic Double-Entry Ledger<br/>
      Official administrative notification.
    </div>
  </div>
</body>
</html>
`, username, reason)

	reqBody := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{recipientEmail},
		ReplyTo: replyTo,
		Subject: "⚠️ Action Required: Identity Verification Update — The Darkhold Exchange",
		HTML:    htmlContent,
	}

	return dispatchResendEmail(apiKey, reqBody, "KYC Rejection", recipientEmail)
}

// SendTradeSettlementEmail dispatches a high-frequency trade confirmation receipt to buyer or seller
func SendTradeSettlementEmail(recipientEmail, username, role, eventSymbol string, quantity int, price, totalAmount int64, tradeID, newQRHash string) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	replyTo := os.Getenv("RESEND_REPLY_TO")

	isBuyer := role == "BUYER"
	badgeText := "ACQUIRED RELIC"
	badgeColor := "#22C55E"
	badgeBg := "rgba(34, 197, 94, 0.12)"
	actionTitle := "Trade Execution Confirmed (Buy)"
	subjectText := fmt.Sprintf("🎯 Trade Confirmed: Acquired %d %s Ticket(s) @ ₹%d — Darkhold DEX", quantity, eventSymbol, price)

	if !isBuyer {
		badgeText = "LIQUIDATED RELIC"
		badgeColor = "#F59E0B"
		badgeBg = "rgba(245, 158, 11, 0.12)"
		actionTitle = "Trade Execution Confirmed (Sell)"
		subjectText = fmt.Sprintf("💰 Trade Confirmed: Sold %d %s Ticket(s) @ ₹%d — Darkhold DEX", quantity, eventSymbol, price)
	}

	qrNotice := ""
	if isBuyer && newQRHash != "" {
		truncatedHash := newQRHash
		if len(truncatedHash) > 16 {
			truncatedHash = truncatedHash[:16] + "..."
		}
		qrNotice = fmt.Sprintf(`
      <div style="background: rgba(212, 175, 55, 0.08); border: 1px dashed rgba(212, 175, 55, 0.4); border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
        <div style="font-family: monospace; font-size: 11px; color: #F5D061; font-weight: 700; letter-spacing: 1px;">🔐 CRYPTOGRAPHIC QR ROTATED:</div>
        <div style="font-family: monospace; font-size: 12px; color: #E5E0D8; margin-top: 4px; word-break: break-all;">Internal Hash: <code>%s</code></div>
        <div style="font-size: 11px; color: #A8A29E; margin-top: 4px;">Seller's previous barcode screenshot has been permanently invalidated.</div>
      </div>
`, truncatedHash)
	} else if !isBuyer {
		qrNotice = fmt.Sprintf(`
      <div style="background: rgba(34, 197, 94, 0.08); border: 1px dashed rgba(34, 197, 94, 0.4); border-radius: 10px; padding: 14px 16px; margin: 20px 0;">
        <div style="font-family: monospace; font-size: 11px; color: #86EFAC; font-weight: 700; letter-spacing: 1px;">💳 FIAT PROCEEDS CREDITED:</div>
        <div style="font-family: monospace; font-size: 13px; color: #FFFFFF; margin-top: 4px;">₹%d credited to your AVAILABLE balance.</div>
        <div style="font-size: 11px; color: #A8A29E; margin-top: 4px;">Zero-sum double-entry ledger swap committed with 0 fees.</div>
      </div>
`, totalAmount)
	}

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #E5E0D8; margin: 0; padding: 24px; }
    .card { max-width: 580px; margin: 0 auto; background: linear-gradient(145deg, #181412 0%%, #0D0B0A 100%%); border: 1px solid rgba(212, 175, 55, 0.35); border-radius: 16px; padding: 36px 32px; box-shadow: 0 12px 40px rgba(0,0,0,0.9); }
    .logo { text-align: center; margin-bottom: 24px; }
    .brand { font-family: 'Georgia', serif; font-size: 22px; font-weight: 900; letter-spacing: 3px; color: #F5D061; text-transform: uppercase; }
    .tag { font-family: monospace; font-size: 11px; letter-spacing: 1px; color: #EF4444; margin-top: 4px; }
    h1 { font-family: 'Georgia', serif; font-size: 22px; color: #FFFFFF; text-align: center; margin: 0 0 16px 0; }
    p { font-size: 14px; line-height: 1.6; color: #B8B2A6; margin: 0 0 16px 0; }
    .badge { display: inline-block; background: %s; color: %s; font-family: monospace; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; padding: 5px 12px; border-radius: 20px; border: 1px solid %s; margin-bottom: 12px; text-transform: uppercase; }
    .receipt-table { width: 100%%; border-collapse: collapse; margin: 20px 0; background: #0E0C0B; border: 1px solid #241E19; border-radius: 10px; overflow: hidden; }
    .receipt-table td { padding: 12px 16px; font-size: 13px; border-bottom: 1px solid #1C1814; }
    .receipt-table td.label { color: #8A8275; font-family: monospace; text-transform: uppercase; font-size: 11px; width: 40%%; }
    .receipt-table td.val { color: #FFFFFF; font-family: monospace; font-weight: 600; text-align: right; }
    .total-row td { background: rgba(212, 175, 55, 0.08); font-size: 15px !important; font-weight: 800 !important; color: #F5D061 !important; border-bottom: none; }
    .cta-btn { display: inline-block; background: linear-gradient(90deg, #D4AF37 0%%, #F5D061 100%%); color: #080706; text-decoration: none; font-weight: 800; font-family: monospace; font-size: 13px; letter-spacing: 1px; padding: 14px 28px; border-radius: 10px; text-transform: uppercase; margin: 10px 0; }
    .footer { font-size: 11px; font-family: monospace; color: #736B5E; text-align: center; border-top: 1px solid #241E19; padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="brand">THE DARKHOLD EXCHANGE</div>
      <div class="tag">SETTLEMENT RECEIPT // TRADE MATCHED</div>
    </div>
    
    <div style="text-align: center;">
      <span class="badge">%s</span>
      <h1>%s</h1>
    </div>

    <p>Greetings <strong>%s</strong>,</p>
    <p>Your limit/market order on the high-frequency secondary book has matched and atomically settled with zero-sum ledger balance guarantees.</p>

    <table class="receipt-table">
      <tr>
        <td class="label">Event Market</td>
        <td class="val">%s</td>
      </tr>
      <tr>
        <td class="label">Quantity</td>
        <td class="val">%d Ticket(s)</td>
      </tr>
      <tr>
        <td class="label">Execution Price</td>
        <td class="val">₹%d</td>
      </tr>
      <tr class="total-row">
        <td class="label" style="color: #F5D061;">Total Settlement</td>
        <td class="val">₹%d</td>
      </tr>
      <tr>
        <td class="label">Trade ID</td>
        <td class="val" style="font-size: 11px; color: #A8A29E;">%s</td>
      </tr>
    </table>

    %s

    <div style="text-align: center; margin: 24px 0;">
      <a href="http://localhost:5173/dashboard" class="cta-btn">View Order Book & Vault &rarr;</a>
    </div>

    <div class="footer">
      Darkhold High-Frequency Settlement Protocol &middot; Double-Entry Ledger<br/>
      Cryptographically verified trade receipt &middot; Zero wash-trading guaranteed.
    </div>
  </div>
</body>
</html>
`, badgeBg, badgeColor, badgeColor, badgeText, actionTitle, username, eventSymbol, quantity, price, totalAmount, tradeID, qrNotice)

	reqBody := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{recipientEmail},
		ReplyTo: replyTo,
		Subject: subjectText,
		HTML:    htmlContent,
	}

	return dispatchResendEmail(apiKey, reqBody, "Trade Settlement ("+role+")", recipientEmail)
}

// Helper: dispatches email request to Resend API
func dispatchResendEmail(apiKey string, reqBody ResendEmailRequest, emailType, recipientEmail string) error {
	jsonBytes, err := json.Marshal(reqBody)
	if err != nil {
		return err
	}

	client := &http.Client{Timeout: 10 * time.Second}
	req, err := http.NewRequest("POST", "https://api.resend.com/emails", bytes.NewBuffer(jsonBytes))
	if err != nil {
		return err
	}

	req.Header.Set("Authorization", "Bearer "+apiKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("failed to dispatch Resend email: %w", err)
	}
	defer resp.Body.Close()

	bodyBytes, _ := io.ReadAll(resp.Body)

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		var resendErr ResendEmailResponse
		_ = json.Unmarshal(bodyBytes, &resendErr)
		errMsg := string(bodyBytes)
		if resendErr.Error != nil {
			errMsg = resendErr.Error.Message
		}
		log.Printf("⚠️  [Resend API Error (%s)] Status %d: %s", emailType, resp.StatusCode, errMsg)
		return fmt.Errorf("resend error (%d): %s", resp.StatusCode, errMsg)
	}

	log.Printf("📧 [Email Dispatched] Sent %s email to %s via Resend", emailType, recipientEmail)
	return nil
}


// SendDutchAuctionNotificationEmail alerts buyers with active bids that a Dutch auction has started
func SendDutchAuctionNotificationEmail(recipientEmail, username, eventName, eventSymbol string, startPrice, reservePrice int64, durationMinutes int) error {
	apiKey := os.Getenv("RESEND_API_KEY")
	fromEmail := os.Getenv("RESEND_FROM_EMAIL")
	replyTo := os.Getenv("RESEND_REPLY_TO")

	htmlContent := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { background-color: #080706; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #E5E0D8; margin: 0; padding: 24px; }
    .card { max-width: 560px; margin: 0 auto; background: linear-gradient(145deg, #181412 0%%, #0D0B0A 100%%); border: 1px solid rgba(245, 158, 11, 0.4); border-radius: 16px; padding: 36px 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.85); }
    .header { text-align: center; margin-bottom: 24px; }
    .badge { display: inline-block; background: rgba(245, 158, 11, 0.15); color: #F59E0B; border: 1px solid rgba(245, 158, 11, 0.4); font-size: 11px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px; border-radius: 9999px; }
    h1 { font-family: 'Georgia', serif; font-size: 24px; color: #FFFFFF; text-align: center; margin: 16px 0 8px 0; }
    p { font-size: 14px; line-height: 1.6; color: #B8B2A6; margin: 0 0 16px 0; }
    .auction-box { background: #080706; border: 1px solid rgba(245, 158, 11, 0.3); border-radius: 12px; padding: 20px; margin: 24px 0; }
    .price-row { display: flex; justify-content: space-between; margin-bottom: 12px; font-size: 14px; }
    .price-label { color: #A8A29E; }
    .price-val { font-family: monospace; font-weight: 700; color: #F59E0B; font-size: 16px; }
    .cta-btn { display: inline-block; background: #F59E0B; color: #080706; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 8px; text-transform: uppercase; letter-spacing: 1px; }
    .footer { font-size: 11px; font-family: monospace; color: #78716C; text-align: center; border-top: 1px solid #292524; padding-top: 20px; margin-top: 28px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">DUTCH AUCTION ALERT</span>
      <h1>Live Price-Decay Auction Started</h1>
    </div>
    <p>Greetings <strong>%s</strong>,</p>
    <p>You have an active buy order in the <strong>%s (%s)</strong> market. A new ticket has just been listed in a <strong>Dutch Auction</strong>!</p>
    
    <div class="auction-box">
      <div style="font-weight: 700; color: #FFFFFF; margin-bottom: 14px; font-size: 16px;">%s</div>
      <div class="price-row">
        <span class="price-label">Initial Starting Price:</span>
        <span class="price-val">&#8377;%d</span>
      </div>
      <div class="price-row">
        <span class="price-label">Floor Reserve Price:</span>
        <span class="price-val" style="color: #10B981;">&#8377;%d</span>
      </div>
      <div class="price-row" style="margin-bottom: 0;">
        <span class="price-label">Auction Duration:</span>
        <span class="price-val" style="color: #E5E0D8;">%d Minutes</span>
      </div>
    </div>
    
    <p style="font-size: 13px; color: #F59E0B;">
      &#9889; The price drops continuously in real-time until someone clicks <strong>Buy</strong>. First-come, first-served!
    </p>

    <div style="text-align: center; margin: 28px 0;">
      <a href="http://localhost:5173/dashboard" class="cta-btn">Snipe Auction on Terminal &rarr;</a>
    </div>

    <div class="footer">
      Automated dispatch from The Darkhold Exchange Protocol &middot; Event-Driven Trading<br/>
      Liquidation Subsystem &middot; Immediate Settlement & QR Rotation Guarantee.
    </div>
  </div>
</body>
</html>
`, username, eventName, eventSymbol, eventName, startPrice, reservePrice, durationMinutes)

	reqBody := ResendEmailRequest{
		From:    fromEmail,
		To:      []string{recipientEmail},
		ReplyTo: replyTo,
		Subject: fmt.Sprintf("⚡ Dutch Auction Live: %s starting at ₹%d (Decaying)", eventSymbol, startPrice),
		HTML:    htmlContent,
	}

	return dispatchResendEmail(apiKey, reqBody, "Dutch Auction Notification", recipientEmail)
}
