import React, { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, ExternalLink, Link as LinkIcon, Loader2, Send, Share2, Info } from 'lucide-react';
import { useAppContext } from '../AppContext';
import { imApi, rewardApi } from '../../../services/api';
import { AxiosError } from 'axios';

export const ShareDrawer: React.FC = () => {
  const { popDrawer, t, selectedProductId, user } = useAppContext();
  const [cardType, setCardType] = useState<'invite' | 'product' | 'merchant' | 'group_buy'>('invite');
  const [targetId, setTargetId] = useState('');
  const [pendingPlatform, setPendingPlatform] = useState<'feishu' | 'whatsapp' | 'telegram' | 'discord' | null>(null);
  const [statusText, setStatusText] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [generated, setGenerated] = useState<any>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [pastedLink, setPastedLink] = useState('');
  const [hoveredPlatform, setHoveredPlatform] = useState<string | null>(null);
  const [hoveredCardType, setHoveredCardType] = useState<string | null>(null);
  const [rewardStats, setRewardStats] = useState<any>(null);

  useEffect(() => {
    const userId = (user as any)?.id || (user as any)?.user_id;
    if (userId) {
      rewardApi.getStatus(userId).then(res => {
        setRewardStats(res.data);
      }).catch(err => console.error("Failed to load reward status", err));
    }
  }, [user]);

  const platformTips: Record<string, string> = {
    feishu: 'Send to Feishu contacts or groups for workplace collaboration.',
    whatsapp: 'Send to WhatsApp chats/groups for overseas community sharing.',
    telegram: 'Send to Telegram groups/channels for content distribution.',
    discord: 'Send to Discord communities for niche viral growth.',
    copy: 'Copy generated referral link and paste to any platform with tracking.',
  };

  const cardTypeTips: Record<string, string> = {
    invite: 'Exclusive invite card for registration and fan binding.',
    product: 'Product card for item referral and cashback reward.',
    merchant: 'Merchant card for merchant referral and reward rules.',
    group_buy: 'Group-buy card for team purchase with completion reward.',
  };

  const shareOptions = useMemo(
    () => [
      { id: 'feishu', label: 'Feishu', color: 'from-sky-500 to-blue-600' },
      { id: 'whatsapp', label: 'WhatsApp', color: 'from-emerald-500 to-green-600' },
      { id: 'telegram', label: 'Telegram', color: 'from-cyan-500 to-sky-600' },
      { id: 'discord', label: 'Discord', color: 'from-indigo-500 to-violet-600' },
      { id: 'copy', label: t('share.copy_link') || 'Copy Link', color: 'from-zinc-500 to-zinc-700' },
    ],
    [t]
  );

  const handleGenerate = async (option: string) => {
    setIsBusy(true);
    setStatusText('');
    setSelectedTemplateId(null);
    try {
      const target = targetId || selectedProductId || undefined;
      const payload = {
        card_type: cardType === 'group_buy' ? 'product' : cardType,
        target_type: cardType === 'merchant' ? 'merchant' : cardType === 'invite' ? 'none' : 'product',
        target_id: target,
        platform: option === 'copy' ? undefined : (option as 'feishu' | 'whatsapp' | 'telegram' | 'discord'),
        entry_type: 'drawer_share',
        share_category: cardType === 'group_buy' ? 'group_buy' : 'distribution',
      };
      const resp = await imApi.generatePromoCard(payload as any);
      const data = resp.data || {};
      setGenerated(data);
      setSelectedTemplateId(data.generatedTemplates?.[0]?.template_id || null);

      if (option === 'copy') {
        const link = data.link || data.short_link || data.share_link;
        if (link) {
          await navigator.clipboard.writeText(link);
          setStatusText('Referral link copied.');
        } else {
          setStatusText('No link generated.');
        }
      } else {
        setPendingPlatform(option as 'feishu' | 'whatsapp' | 'telegram' | 'discord');
        setStatusText(`Generated ${data.generatedTemplates?.length || 0} templates. Select one and send.`);
      }
    } catch (e) {
      const ax = e as AxiosError;
      const status = (ax as any)?.response?.status;
      if (status === 401) setStatusText('Please login first to generate share cards.');
      else if (ax?.code === 'ERR_NETWORK') setStatusText('Network error. Please check backend on port 8000.');
      else setStatusText('Failed to generate promo card.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBuildFromLink = async () => {
    if (!pastedLink.trim()) {
      setStatusText('Paste full sharing link first.');
      return;
    }
    setIsBusy(true);
    try {
      const resp = await imApi.buildTemplatesFromLink(pastedLink.trim());
      const data = resp.data || {};
      setGenerated({
        ...generated,
        generatedTemplates: data.templates || [],
        link: pastedLink.trim(),
      });
      setSelectedTemplateId((data.templates || [])[0]?.template_id || null);
      setStatusText(`Parsed link successfully. Generated ${(data.templates || []).length} templates.`);
    } catch (e) {
      const ax = e as AxiosError;
      if (ax?.code === 'ERR_NETWORK') setStatusText('Network error. Please check backend on port 8000.');
      else setStatusText('Failed to parse sharing link.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSendTemplate = async () => {
    if (!pendingPlatform || !generated?.share_token) return;
    setIsBusy(true);
    try {
      await imApi.sendPromoCard({
        share_token: generated.share_token,
        platform: pendingPlatform,
        template_id: selectedTemplateId || undefined,
      });
      setStatusText(`Sent to ${pendingPlatform}.`);
      setTimeout(() => popDrawer(), 500);
    } catch {
      setStatusText('Failed to send template.');
    } finally {
      setIsBusy(false);
    }
  };

  return (
    <div className="flex h-full flex-col gap-3 overflow-y-auto bg-[#F2F2F7] p-4 pb-24 dark:bg-[#000000]">
      <div className="rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mb-3 text-[18px] font-black text-gray-900 dark:text-white">{t('share.title') || 'Share & Earn'}</div>
        
        {rewardStats && (
          <div className="mb-4 rounded-2xl bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 p-3 border border-orange-200/50 dark:border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-orange-600 dark:text-orange-400" />
              <span className="text-[12px] font-bold text-orange-800 dark:text-orange-300">My Reward Rates</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">Tier</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{rewardStats.user_tier || 'Standard'}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-gray-500 dark:text-gray-400">Identity</span>
                <span className="font-semibold text-gray-800 dark:text-gray-200 capitalize">{rewardStats.user_type || 'User'}</span>
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-gray-500 dark:text-gray-400">Distribution</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{(rewardStats.dist_rate || rewardStats.referral_rate || 0) * 100}%</span>
              </div>
              <div className="flex flex-col mt-1">
                <span className="text-gray-500 dark:text-gray-400">Fan Bonus</span>
                <span className="font-semibold text-orange-600 dark:text-orange-400">{(rewardStats.fan_rate || 0) * 100}%</span>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3">
          <div className="mb-1 text-[12px] font-bold text-gray-700 dark:text-gray-300">Card Type</div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'invite', label: 'Invite Card' },
              { id: 'product', label: 'Product Card' },
              { id: 'merchant', label: 'Merchant Card' },
              { id: 'group_buy', label: 'Group-buy Card' },
            ].map((opt) => (
              <button
                key={opt.id}
                onMouseEnter={() => setHoveredCardType(opt.id)}
                onMouseLeave={() => setHoveredCardType(null)}
                onClick={() => setCardType(opt.id as any)}
                className={`rounded-full px-3 py-1.5 text-[11px] font-semibold transition ${
                  cardType === opt.id ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-3">
          <div className="mb-1 text-[12px] font-bold text-gray-700 dark:text-gray-300">Target ID</div>
          <input
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            placeholder={cardType === 'merchant' ? 'Enter merchant ID' : 'Enter product ID'}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none dark:border-white/10 dark:bg-white/5"
          />
        </div>

        <div className="grid grid-cols-5 gap-2">
          {shareOptions.map((option) => (
            <button
              key={option.id}
              onMouseEnter={() => setHoveredPlatform(option.id)}
              onMouseLeave={() => setHoveredPlatform(null)}
              onClick={() => handleGenerate(option.id)}
              disabled={isBusy}
              className="group flex flex-col items-center gap-1.5 rounded-2xl bg-white p-2 text-[11px] font-semibold text-gray-700 shadow-sm transition hover:shadow-md disabled:opacity-60 dark:bg-white/10 dark:text-gray-200"
            >
              <div className={`flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br ${option.color} text-white`}>
                {option.id === 'copy' ? <LinkIcon className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
              </div>
              <span>{option.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-[11px] text-blue-700 dark:border-blue-900/40 dark:bg-blue-900/20 dark:text-blue-200">
          {(hoveredPlatform && platformTips[hoveredPlatform]) || (hoveredCardType && cardTypeTips[hoveredCardType]) || cardTypeTips[cardType]}
        </div>
      </div>

      <div className="rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
        <div className="mb-1 text-[12px] font-bold text-gray-700 dark:text-gray-300">Build from link</div>
        <div className="flex gap-2">
          <input
            value={pastedLink}
            onChange={(e) => setPastedLink(e.target.value)}
            placeholder="Paste full sharing link"
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] outline-none dark:border-white/10 dark:bg-white/5"
          />
          <button onClick={handleBuildFromLink} disabled={isBusy} className="rounded-xl bg-gray-900 px-3 py-2 text-[11px] font-bold text-white disabled:opacity-60 dark:bg-white dark:text-black">
            Parse
          </button>
        </div>
      </div>

      {generated?.generatedTemplates?.length > 0 && (
        <div className="rounded-[28px] border border-white/40 bg-white/70 p-4 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-white/5">
          <div className="mb-2 text-[12px] font-bold text-gray-700 dark:text-gray-300">Template cards ({pendingPlatform || 'No platform'})</div>
          <div className="space-y-2">
            {generated.generatedTemplates.map((tpl: any, idx: number) => {
              const tid = tpl.template_id || `tpl_${idx}`;
              const selected = selectedTemplateId === tid;
              return (
                <button
                  key={tid}
                  onClick={() => setSelectedTemplateId(tid)}
                  className={`w-full rounded-xl border p-3 text-left ${selected ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-700 dark:bg-emerald-900/20' : 'border-gray-200 bg-white dark:border-white/10 dark:bg-white/5'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-[12px] font-semibold text-gray-800 dark:text-gray-200">{tpl.title || tpl.card_title || `Template ${idx + 1}`}</div>
                      <div className="mt-1 truncate text-[11px] text-gray-500 dark:text-gray-400">{tpl.summary || tpl.desc || tpl.card_subtitle || '-'}</div>
                    </div>
                    {selected ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <ExternalLink className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>
              );
            })}
          </div>
          <button
            onClick={handleSendTemplate}
            disabled={!pendingPlatform || !generated?.share_token || isBusy}
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gray-900 px-3 py-2 text-[12px] font-semibold text-white disabled:opacity-50 dark:bg-white dark:text-black"
          >
            {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {pendingPlatform ? `Send to ${pendingPlatform}` : 'Select platform to send'}
          </button>
        </div>
      )}

      {statusText && (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-3 py-2 text-[12px] text-orange-700 dark:border-orange-900/40 dark:bg-orange-900/20 dark:text-orange-300">
          {statusText}
        </div>
      )}

      <button
        onClick={() => popDrawer()}
        className="rounded-[20px] border border-white/10 bg-gray-100 py-3 text-[15px] font-semibold text-gray-900 transition active:scale-95 dark:bg-white/5 dark:text-white"
      >
        {t('common.cancel')}
      </button>
    </div>
  );
};
