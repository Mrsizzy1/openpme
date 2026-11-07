import React, { useEffect, useState } from 'react';
import { ApiClient } from '../api/client';
import { Building2, Save, Landmark, ShieldAlert, FileText, Bell, MessageSquare, Send } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Alert, Button, Field, SectionCard } from '../components/ui';
import { formatDate, formatNumber } from '../lib/format';
import './SettingsPage.css';

export const SettingsPage: React.FC = () => {
  const { organization, refreshProfile } = useAuth();
  const { success, error: toastError } = useToast();
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Informations entreprise
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [taxId, setTaxId] = useState('');
  const [rccm, setRccm] = useState('');
  const [idNat, setIdNat] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');

  // Paramètres financiers
  const [primaryCurrency, setPrimaryCurrency] = useState('CDF');
  const [secondaryCurrency, setSecondaryCurrency] = useState('USD');
  const [exchangeRate, setExchangeRate] = useState('2850');
  const [rateHistory, setRateHistory] = useState<any[]>([]);
  const [taxRatePercent, setTaxRatePercent] = useState('16');
  const [enableTax, setEnableTax] = useState(true);
  const [invoicePrefix, setInvoicePrefix] = useState('FAC-');

  // Seuils d'alerte
  const [alertMaxDiscount, setAlertMaxDiscount] = useState('15');
  const [alertLargeExpense, setAlertLargeExpense] = useState('2000000');
  const [alertCashDiscrepancy, setAlertCashDiscrepancy] = useState('15000');

  // Mentions légales
  const [invoiceFooterNote, setInvoiceFooterNote] = useState('');
  const [bankDetails, setBankDetails] = useState('');

  // Notifications & Alertes Dirigeant (WhatsApp & Telegram)
  const [managerWhatsapp, setManagerWhatsapp] = useState('');
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [testingTelegram, setTestingTelegram] = useState(false);
  const [testingReport, setTestingReport] = useState(false);

  useEffect(() => {
    const savedTgToken = localStorage.getItem('smart_pme_tg_token') || '';
    const savedTgChatId = localStorage.getItem('smart_pme_tg_chat_id') || '';
    const savedWa = localStorage.getItem('smart_pme_manager_wa') || '';
    setTelegramBotToken(savedTgToken);
    setTelegramChatId(savedTgChatId);
    setManagerWhatsapp(savedWa);
  }, []);

  const handleTestTelegram = async () => {
    if (!telegramBotToken || !telegramChatId) {
      toastError('Veuillez renseigner le Bot Token et le Chat ID Telegram.');
      return;
    }
    setTestingTelegram(true);
    try {
      localStorage.setItem('smart_pme_tg_token', telegramBotToken);
      localStorage.setItem('smart_pme_tg_chat_id', telegramChatId);
      const res = await ApiClient.testTelegramAlert(telegramBotToken, telegramChatId);
      if (res.success) {
        success('Message test envoyé avec succès sur Telegram !');
      } else {
        toastError(res.error || 'Erreur lors de l\'envoi Telegram.');
      }
    } catch (err: any) {
      toastError(err.message || 'Impossible de joindre l\'API Telegram.');
    } finally {
      setTestingTelegram(false);
    }
  };

  const handleTestDailyReport = async () => {
    setTestingReport(true);
    try {
      if (managerWhatsapp) localStorage.setItem('smart_pme_manager_wa', managerWhatsapp);
      const res = await ApiClient.generateDailyReport({
        whatsappPhone: managerWhatsapp || undefined,
        telegramBotToken: telegramBotToken || undefined,
        telegramChatId: telegramChatId || undefined,
      });

      if (res.telegramSent) {
        success('Rapport du jour envoyé sur Telegram.');
      }
      if (res.whatsappUrl) {
        window.open(res.whatsappUrl, '_blank');
        success('Rapport du jour prêt à envoyer dans WhatsApp.');
      }
    } catch (err: any) {
      toastError(err.message || 'Erreur lors de la génération du rapport.');
    } finally {
      setTestingReport(false);
    }
  };

  useEffect(() => {
    if (organization) {
      setName(organization.name || '');
      setLegalName(organization.legalName || '');
      setTaxId(organization.taxId || '');
      setRccm(organization.rccm || '');
      setIdNat(organization.idNat || '');
      setPhone(organization.phone || '');
      setEmail(organization.email || '');
      setAddress(organization.address || '');
      setCity(organization.city || 'Kinshasa');
      const s = organization.settings;
      if (s) {
        setPrimaryCurrency(s.primaryCurrency || 'CDF');
        setSecondaryCurrency(s.secondaryCurrency || 'USD');
        setExchangeRate(s.exchangeRateUsdToCdf?.toString() || '2850');
        setTaxRatePercent(s.taxRatePercent?.toString() || '16');
        setEnableTax(Boolean(s.enableTax));
        setInvoicePrefix(s.invoicePrefix || 'FAC-');
        setAlertMaxDiscount(s.alertMaxDiscountPercent?.toString() || '15');
        setAlertLargeExpense(s.alertLargeExpenseThreshold?.toString() || '2000000');
        setAlertCashDiscrepancy(s.alertCashDiscrepancyThreshold?.toString() || '15000');
        setInvoiceFooterNote(s.invoiceFooterNote || '');
        setBankDetails(s.bankDetails || '');
      }
    }
  }, [organization]);

  useEffect(() => {
    ApiClient.getExchangeRates(10)
      .then(setRateHistory)
      .catch((err: Error) => toastError(err.message || 'Impossible de charger l’historique des taux.'));
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!name.trim()) {
      setFormError('Le nom commercial de l\'entreprise est obligatoire.');
      return;
    }
    if (!exchangeRate || parseFloat(exchangeRate) <= 0) {
      setFormError('Le taux de change USD/CDF doit être supérieur à 0.');
      return;
    }

    setSaving(true);
    try {
      await ApiClient.updateOrgProfile({
        name: name.trim(),
        legalName: legalName.trim() || undefined,
        taxId: taxId.trim() || undefined,
        rccm: rccm.trim() || undefined,
        idNat: idNat.trim() || undefined,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
      });

      await ApiClient.updateOrgSettings({
        primaryCurrency,
        secondaryCurrency,
        exchangeRateUsdToCdf: exchangeRate,
        taxRatePercent: parseFloat(taxRatePercent) || 16,
        enableTax,
        invoicePrefix: invoicePrefix.trim() || 'FAC-',
        alertMaxDiscountPercent: parseFloat(alertMaxDiscount) || 15,
        alertLargeExpenseThreshold: parseFloat(alertLargeExpense) || 2000000,
        alertCashDiscrepancyThreshold: parseFloat(alertCashDiscrepancy) || 15000,
        invoiceFooterNote: invoiceFooterNote.trim() || undefined,
        bankDetails: bankDetails.trim() || undefined,
      });

      await refreshProfile();
      setRateHistory(await ApiClient.getExchangeRates(10));
      if (typeof BroadcastChannel !== 'undefined') {
        const ch = new BroadcastChannel('smart_pme_sync_channel');
        ch.postMessage({
          type: 'EXCHANGE_RATE_UPDATED',
          rate: parseFloat(exchangeRate) || 2850,
        });
        ch.close();
      }
      success('Paramètres enregistrés et synchronisés sur tous les postes.');
    } catch (err: any) {
      setFormError(err.message || 'Erreur lors de la sauvegarde des paramètres.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="page settings-page" onSubmit={handleSaveAll}>
      {formError && (
        <Alert tone="danger" title="Enregistrement impossible" onDismiss={() => setFormError(null)}>
          {formError}
        </Alert>
      )}

      <SectionCard
        title="Identité de l’entreprise"
        description="Ces informations apparaissent sur vos factures et documents officiels."
        icon={Building2}
      >
        <div className="form-grid">
          <Field label="Nom commercial" required htmlFor="set-name">
            <input id="set-name" type="text" required className="input-field"
              placeholder="Ex. Commerce Diallo SARL" value={name}
              onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Dénomination légale" htmlFor="set-legal">
            <input id="set-legal" type="text" className="input-field"
              placeholder="Raison sociale officielle" value={legalName}
              onChange={(e) => setLegalName(e.target.value)} />
          </Field>
        </div>

        <div className="form-grid-3">
          <Field label="NIF (numéro fiscal)" htmlFor="set-taxid">
            <input id="set-taxid" type="text" className="input-field"
              placeholder="A0000000X" value={taxId}
              onChange={(e) => setTaxId(e.target.value)} />
          </Field>
          <Field label="N° RCCM" htmlFor="set-rccm">
            <input id="set-rccm" type="text" className="input-field"
              placeholder="CD/KIN/RCCM/…" value={rccm}
              onChange={(e) => setRccm(e.target.value)} />
          </Field>
          <Field label="Identifiant national" htmlFor="set-idnat">
            <input id="set-idnat" type="text" className="input-field"
              placeholder="ID NAT" value={idNat}
              onChange={(e) => setIdNat(e.target.value)} />
          </Field>
        </div>

        <div className="form-grid">
          <Field label="Téléphone" htmlFor="set-phone">
            <input id="set-phone" type="tel" className="input-field"
              placeholder="+243 8X XXX XXXX" value={phone}
              onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="E-mail" htmlFor="set-email">
            <input id="set-email" type="email" className="input-field"
              placeholder="contact@monentreprise.cd" value={email}
              onChange={(e) => setEmail(e.target.value)} />
          </Field>
        </div>

        <div className="form-grid">
          <Field label="Adresse" htmlFor="set-address" className="mb-0">
            <input id="set-address" type="text" className="input-field"
              placeholder="Avenue, numéro, commune" value={address}
              onChange={(e) => setAddress(e.target.value)} />
          </Field>
          <Field label="Ville" htmlFor="set-city" className="mb-0">
            <input id="set-city" type="text" className="input-field"
              placeholder="Kinshasa" value={city}
              onChange={(e) => setCity(e.target.value)} />
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Devises et fiscalité"
        description="Le taux du jour s’applique immédiatement à toutes les caisses."
        icon={Landmark}
      >
        <div className="form-grid-3">
          <Field label="Devise principale" htmlFor="set-curr">
            <select id="set-curr" className="select-field" value={primaryCurrency}
              onChange={(e) => {
                const value = e.target.value;
                setPrimaryCurrency(value);
                if (value === secondaryCurrency) setSecondaryCurrency(value === 'CDF' ? 'USD' : 'CDF');
              }}>
              <option value="CDF">CDF — Franc congolais</option>
              <option value="USD">USD — Dollar américain</option>
            </select>
          </Field>
          <Field label="Devise secondaire" htmlFor="set-curr2">
            <select id="set-curr2" className="select-field" value={secondaryCurrency}
              onChange={(e) => setSecondaryCurrency(e.target.value)}>
              <option value="USD">USD — Dollar américain</option>
              <option value="CDF">CDF — Franc congolais</option>
            </select>
          </Field>
          <Field label="Taux du jour (1 USD)" required htmlFor="set-rate" hint="Enregistré dans l’historique journalier des taux.">
            <div className="input-addon">
              <input id="set-rate" type="number" min="0.0001" step="0.0001" required className="input-field"
                value={exchangeRate} onChange={(e) => setExchangeRate(e.target.value)} />
              <span className="input-addon-text">CDF</span>
            </div>
          </Field>
        </div>

        {rateHistory.length > 0 && (
          <div className="settings-rates">
            <span className="settings-rates-label">Derniers taux</span>
            {rateHistory.slice(0, 5).map((rate, index) => (
              <span key={rate.id ?? index} className="settings-rate">
                {formatDate(rate.effectiveDate)} · <strong>{formatNumber(Number(rate.rate))} CDF</strong>
              </span>
            ))}
          </div>
        )}

        <div className="form-grid">
          <Field label="TVA" htmlFor="set-tax">
            <label className="settings-check">
              <input type="checkbox" id="set-tax" checked={enableTax}
                onChange={(e) => setEnableTax(e.target.checked)} />
              Appliquer la TVA sur les ventes
            </label>
          </Field>
          <Field label="Taux de TVA" htmlFor="set-taxrate">
            <div className="input-addon">
              <input id="set-taxrate" type="number" min="0" max="100" step="0.1"
                className="input-field" value={taxRatePercent} disabled={!enableTax}
                onChange={(e) => setTaxRatePercent(e.target.value)} />
              <span className="input-addon-text">%</span>
            </div>
          </Field>
        </div>

        <Field label="Préfixe de numérotation des factures" htmlFor="set-prefix" hint="Ex. : FAC- donne FAC-000001 ; FAC-2026- donne FAC-2026-000001." className="mb-0">
          <input id="set-prefix" type="text" className="input-field settings-prefix"
            placeholder="FAC-" value={invoicePrefix}
            onChange={(e) => setInvoicePrefix(e.target.value)} />
        </Field>
      </SectionCard>

      <SectionCard
        title="Seuils de détection des anomalies"
        description="Au-delà de ces seuils, une alerte est créée automatiquement."
        icon={ShieldAlert}
        iconTone="warning"
      >
        <div className="form-grid-3">
          <Field label="Remise maximale autorisée" htmlFor="set-disc" hint="Au-delà, une anomalie est créée." className="mb-0">
            <div className="input-addon">
              <input id="set-disc" type="number" min="0" max="100" step="0.5"
                className="input-field" value={alertMaxDiscount}
                onChange={(e) => setAlertMaxDiscount(e.target.value)} />
              <span className="input-addon-text">%</span>
            </div>
          </Field>
          <Field label="Seuil de dépense importante" htmlFor="set-exp" hint="Montant d’une dépense unique déclenchant une alerte." className="mb-0">
            <div className="input-addon">
              <input id="set-exp" type="number" min="0" step="1000"
                className="input-field" value={alertLargeExpense}
                onChange={(e) => setAlertLargeExpense(e.target.value)} />
              <span className="input-addon-text">CDF</span>
            </div>
          </Field>
          <Field label="Écart de caisse toléré" htmlFor="set-cash" hint="Écart entre le montant compté et le théorique." className="mb-0">
            <div className="input-addon">
              <input id="set-cash" type="number" min="0" step="100"
                className="input-field" value={alertCashDiscrepancy}
                onChange={(e) => setAlertCashDiscrepancy(e.target.value)} />
              <span className="input-addon-text">CDF</span>
            </div>
          </Field>
        </div>
      </SectionCard>

      <SectionCard
        title="Mentions légales et coordonnées bancaires"
        description="Imprimées en pied de facture."
        icon={FileText}
      >
        <Field label="Pied de facture" htmlFor="set-footer">
          <textarea
            id="set-footer"
            rows={2}
            className="input-field"
            placeholder="Ex. : Tout retard de paiement entraîne des pénalités de 2 % par mois."
            value={invoiceFooterNote}
            onChange={(e) => setInvoiceFooterNote(e.target.value)}
          />
        </Field>
        <Field label="Coordonnées bancaires" htmlFor="set-bank" className="mb-0">
          <textarea
            id="set-bank"
            rows={2}
            className="input-field"
            placeholder="Ex. : Rawbank Kinshasa — IBAN : CD… — SWIFT : …"
            value={bankDetails}
            onChange={(e) => setBankDetails(e.target.value)}
          />
        </Field>
      </SectionCard>

      <SectionCard
        title="Rapport du dirigeant"
        description="Envoyez à la demande le rapport de clôture du jour (ventes, dépenses, écarts de caisse, anomalies) sur Telegram ou WhatsApp. Ces coordonnées sont enregistrées sur ce poste uniquement."
        icon={Bell}
        footer={(
          <div className="settings-test-actions">
            <Button icon={<Send size={14} />} onClick={handleTestTelegram} loading={testingTelegram} loadingText="Test en cours…">
              Tester le bot Telegram
            </Button>
            <Button icon={<MessageSquare size={14} />} onClick={handleTestDailyReport} loading={testingReport} loadingText="Génération…">
              Envoyer le rapport du jour
            </Button>
          </div>
        )}
      >
        <div className="form-grid-3">
          <Field label="Numéro WhatsApp du dirigeant" htmlFor="set-wa" hint="Format international, ex. +243812345678." className="mb-0">
            <input
              id="set-wa"
              type="tel"
              className="input-field"
              placeholder="+243…"
              value={managerWhatsapp}
              onChange={(e) => setManagerWhatsapp(e.target.value)}
            />
          </Field>
          <Field label="Jeton du bot Telegram" htmlFor="set-tg-token" hint="Fourni par @BotFather sur Telegram." className="mb-0">
            <input
              id="set-tg-token"
              type="password"
              autoComplete="off"
              className="input-field"
              placeholder="123456789:ABC…"
              value={telegramBotToken}
              onChange={(e) => setTelegramBotToken(e.target.value)}
            />
          </Field>
          <Field label="Identifiant du chat ou du canal" htmlFor="set-tg-chat" hint="Votre compte ou le groupe de direction." className="mb-0">
            <input
              id="set-tg-chat"
              type="text"
              className="input-field"
              placeholder="987654321 ou @mon_canal"
              value={telegramChatId}
              onChange={(e) => setTelegramChatId(e.target.value)}
            />
          </Field>
        </div>
      </SectionCard>

      <div className="settings-savebar">
        <span className="settings-savebar-text">Les modifications s’appliquent à tous les postes après l’enregistrement.</span>
        <Button type="submit" variant="primary" icon={<Save size={15} />} loading={saving} loadingText="Enregistrement…">
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
};
