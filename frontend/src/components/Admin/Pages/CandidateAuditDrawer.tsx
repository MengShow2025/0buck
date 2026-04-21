import React, { useState, useEffect } from 'react';
import { X, ExternalLink, RefreshCw, Save, CheckCircle2, DollarSign } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Textarea } from '../ui/Textarea';
import { Badge } from '../ui/Badge';
import { adminApi } from '../../../services/api';

interface CandidateAuditDrawerProps {
  candidate: any;
  isOpen: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const CandidateAuditDrawer: React.FC<CandidateAuditDrawerProps> = ({ candidate, isOpen, onClose, onRefresh }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title_en_preview: '',
    description_en_preview: '',
    desire_hook: '',
    desire_logic: '',
    truth_body: '',
    sell_price: 0,
    cost_usd: 0,
    freight_fee: 0,
    amazon_price: 0,
    amazon_shipping_cost: 0,
    amazon_compare_at_price: 0,
    category_type: 'NORMAL',
    product_category_label: 'NORMAL',
    source_pid: '',
  });

  useEffect(() => {
    if (candidate) {
      setFormData({
        title_en_preview: candidate.title_en_preview || candidate.title_en || candidate.title_zh || '',
        description_en_preview: candidate.description_en_preview || candidate.description_zh || '',
        desire_hook: candidate.desire_hook || '',
        desire_logic: candidate.desire_logic || '',
        truth_body: candidate.truth_body || '',
        sell_price: candidate.sell_price || candidate.estimated_sale_price || 0,
        cost_usd: candidate.cost_usd || (candidate.cost_cny ? candidate.cost_cny * 0.14 : 0),
        freight_fee: candidate.freight_fee || 0,
        amazon_price: candidate.amazon_price || candidate.amazon_sale_price || 0,
        amazon_shipping_cost: candidate.amazon_shipping_cost || 0,
        amazon_compare_at_price: candidate.amazon_compare_at_price || candidate.amazon_price || 0,
        category_type: candidate.product_category_label || candidate.category_type || 'NORMAL',
        product_category_label: candidate.product_category_label || 'NORMAL',
        source_pid: candidate.source_pid || candidate.product_id_1688 || '',
      });
    }
  }, [candidate]);

  if (!isOpen || !candidate) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name.includes('price') ? parseFloat(value) || 0 : value
    }));
  };

  const handleSave = async (publish: boolean = false) => {
    setLoading(true);
    try {
      if (publish) {
        // When publishing, we directly approve. The backend can save the current form data if passed, 
        // or we save first, THEN approve.
        await adminApi.updateCandidate(candidate.id, formData);
        await adminApi.approveCandidate(candidate.id);
      } else {
        await adminApi.updateCandidate(candidate.id, formData);
      }
      onRefresh();
      onClose();
    } catch (e: any) {
      console.error(e);
      console.error('Error in handleSave:', e.response?.data?.detail || e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRepolish = async () => {
    setLoading(true);
    try {
      const res = await adminApi.repolishCandidate(candidate.id);
      if (res.data?.candidate) {
        setFormData(prev => ({
          ...prev,
          title_en_preview: res.data.candidate.title_en_preview || prev.title_en_preview,
          description_en_preview: res.data.candidate.description_en_preview || prev.description_en_preview
        }));
        alert('AI 重新润色成功！');
      }
    } catch (e: any) {
      console.error(e);
      alert(e.response?.data?.detail || e.message || 'AI 润色失败');
    } finally {
      setLoading(false);
    }
  };

  const images = Array.isArray(candidate.images) ? candidate.images : [];

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 transition-opacity">
      <div className="w-full max-w-4xl h-full bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div>
            <h2 className="text-xl font-black text-gray-900">商品审核 (v8.5.8 Truth Engine)</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase text-white bg-orange-600">
                ALIBABA INTERNATIONAL
              </span>
              <p className="text-sm text-gray-500 font-bold">PID: {candidate.source_pid || candidate.product_id_1688 || candidate.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Media Section */}
          <section>
            <h3 className="text-sm font-black text-gray-900 mb-3 uppercase tracking-wider">媒体文件与资质 (Media & Certs)</h3>
            <div className="flex gap-4 overflow-x-auto pb-4 snap-x">
              {images.map((img: string, idx: number) => (
                <img key={idx} src={img} alt="Product" className="h-32 w-32 object-cover rounded-xl border border-gray-200 shadow-sm snap-start" />
              ))}
              {Array.isArray(candidate.certificate_images) && candidate.certificate_images.map((img: string, idx: number) => (
                <div key={`cert-${idx}`} className="relative h-32 w-32 snap-start">
                  <img src={img} alt="Certificate" className="h-full w-full object-cover rounded-xl border-2 border-amber-200 shadow-sm" />
                  <div className="absolute top-1 right-1 bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold">资质</div>
                </div>
              ))}
              {images.length === 0 && (!candidate.certificate_images || candidate.certificate_images.length === 0) && (
                <div className="text-sm text-gray-400 font-bold">无图片或资质数据</div>
              )}
            </div>
          </section>

          {/* AI Content Section */}
          <section className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 relative">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-amber-900 uppercase tracking-wider flex items-center gap-2">
                AI 润色文案 (Marketing Copy)
              </h3>
              <Button onClick={handleRepolish} disabled={loading} variant="outline" className="h-8 text-xs border-amber-300 text-amber-700 hover:bg-amber-100">
                <RefreshCw className={`w-3 h-3 mr-2 ${loading ? 'animate-spin' : ''}`} /> 重新润色
              </Button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Original Source Data */}
              <div className="space-y-4 opacity-75">
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">源标题 (Source Title)</label>
                  <div className="p-2.5 bg-white/50 border border-gray-200 rounded-lg text-sm text-gray-600 font-medium">
                    {candidate.title_zh || '无'}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 mb-1">源详情 (Source Description)</label>
                  <div className="p-2.5 bg-white/50 border border-gray-200 rounded-lg text-xs text-gray-500 font-mono h-[120px] overflow-y-auto">
                    <div dangerouslySetInnerHTML={{ __html: candidate.description_zh || '无' }} />
                  </div>
                </div>
              </div>

              {/* Editable AI Data */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">英文标题 (Title)</label>
                  <Input 
                    name="title_en_preview"
                    value={formData.title_en_preview}
                    onChange={handleChange}
                    className="font-bold text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">欲望钩子 (Desire Hook)</label>
                  <Input 
                    name="desire_hook"
                    value={formData.desire_hook}
                    onChange={handleChange}
                    className="text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">欲望逻辑 (Desire Logic)</label>
                  <Textarea 
                    name="desire_logic"
                    value={formData.desire_logic}
                    onChange={handleChange}
                    className="min-h-[80px] text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-1">真理正文 (Truth Body / Description)</label>
                  <Textarea 
                    name="truth_body"
                    value={formData.truth_body}
                    onChange={handleChange}
                    className="min-h-[150px] font-mono text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* Pricing Strategy */}
          <section className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
            <h3 className="text-sm font-black text-gray-900 mb-4 uppercase tracking-wider">0Buck 定价与利润 (Pricing & Margin)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alibaba 采购 (USD)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="number"
                    name="cost_usd"
                    value={formData.cost_usd}
                    onChange={handleChange}
                    className="pl-9 font-mono text-gray-900 font-black bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Alibaba Official DDP</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="number"
                    name="freight_fee"
                    value={formData.freight_fee}
                    onChange={handleChange}
                    className="pl-9 font-mono text-gray-900 font-black bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-blue-700 mb-1">0Buck 售价 (Sale Price)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
                  <Input 
                    type="number"
                    name="sell_price"
                    value={formData.sell_price}
                    onChange={handleChange}
                    className="pl-9 font-mono font-bold text-blue-700 border-blue-200 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">划线价 (Compare At)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input 
                    type="number"
                    name="amazon_compare_at_price"
                    value={formData.amazon_compare_at_price}
                    onChange={handleChange}
                    className="pl-9 font-mono text-gray-500"
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">总落地成本 (Total Landed Cost)</label>
                <div className="h-10 flex items-center px-3 bg-gray-900 rounded-lg text-white font-black text-sm border border-gray-200">
                  ${(formData.cost_usd + formData.freight_fee).toFixed(2)}
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Amazon Shipping (Ref)</label>
                <div className="h-10 flex items-center px-3 bg-gray-100 rounded-lg text-gray-900 font-black text-sm border border-gray-200">
                  ${formData.amazon_shipping_cost || '0.00'}
                </div>
              </div>
            </div>

            {formData.product_category_label === 'MAGNET' ? (
              <div className="mt-4 p-4 bg-orange-50 border-2 border-orange-200 rounded-2xl">
                <div className="text-[10px] font-black text-orange-800 uppercase mb-3 tracking-widest flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  Magnet Arbitrage Analysis (0元购套利精算)
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="bg-white p-3 rounded-xl border border-orange-100">
                    <div className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">Amazon Shipping Revenue</div>
                    <div className="text-xl font-black text-gray-900">${formData.amazon_shipping_cost || '0.00'}</div>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-orange-100">
                    <div className="text-[10px] text-orange-600 font-bold uppercase tracking-tighter">Total Alibaba Cost</div>
                    <div className="text-xl font-black text-gray-900">
                      ${((parseFloat(candidate.cost_usd) || 0) + (parseFloat(candidate.freight_fee) || 0)).toFixed(2)}
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t-2 border-orange-100 border-dashed flex justify-between items-center">
                  <div>
                    <span className="text-xs font-black text-orange-900 uppercase">Net Margin (纯利空间)</span>
                    <p className="text-[10px] text-orange-600 font-medium">扣除退款风险前的单客毛利</p>
                  </div>
                  <span className="text-3xl font-black text-emerald-600 drop-shadow-sm">
                    ${((formData.amazon_shipping_cost || 0) - ((parseFloat(candidate.cost_usd) || 0) + (parseFloat(candidate.freight_fee) || 0))).toFixed(2)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div>
                    <span className="text-xs text-gray-500 font-bold block">当前倍率 (Multiplier)</span>
                    <span className="text-lg font-black text-emerald-600">
                      { (formData.cost_usd + formData.freight_fee > 0) ? 
                        ((formData.amazon_price || 0) / (formData.cost_usd + formData.freight_fee)).toFixed(2) + 'x' : 
                        '数据不全'}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-500 font-bold block">商品阶梯 (v8.5 Tier)</span>
                    <select 
                      name="product_category_label"
                      value={formData.product_category_label}
                      onChange={handleChange}
                      className="mt-1 block w-40 rounded-md border-gray-300 text-sm font-black text-gray-900 focus:border-amber-500 focus:ring-amber-500"
                    >
                      <option value="MAGNET">0元磁铁 (MAGNET)</option>
                      <option value="REBATE">20期全返 (REBATE)</option>
                      <option value="NORMAL">常规利润 (NORMAL)</option>
                      <option value="HOT">趋势爆款 (HOT)</option>
                    </select>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-500 font-bold block mb-1">亚马逊对比价 (Amazon)</span>
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">售价</span>
                      <span className="text-sm font-mono font-bold text-gray-900">${formData.amazon_price || '0.00'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-400">运费</span>
                      <span className="text-sm font-mono font-bold text-amber-600">${formData.amazon_shipping_cost || '0.00'}</span>
                    </div>
                    <div className="flex items-center gap-2 border-t border-gray-200 pt-1 mt-1">
                      <span className="text-[10px] text-gray-500 font-bold">总计</span>
                      <span className="text-sm font-mono font-black text-green-600">
                        ${(Number(formData.amazon_price || 0) + Number(formData.amazon_shipping_cost || 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          <section>
            <h3 className="text-sm font-black text-gray-900 mb-3 uppercase tracking-wider">溯源与比价 (Sourcing & Market)</h3>
            <div className="flex gap-4">
              <a 
                href={candidate.source_url || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-amber-500 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="text-sm font-bold text-gray-900 group-hover:text-amber-600">
                    {candidate.source_platform || 'ALIBABA'} 采购链接
                  </div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px] mt-1">{candidate.source_url || '未提供'}</div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-amber-500" />
              </a>
              <a 
                href={candidate.amazon_link || candidate.market_comparison_url || '#'} 
                target="_blank" 
                rel="noreferrer"
                className="flex-1 bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between hover:border-blue-500 hover:shadow-md transition-all group"
              >
                <div>
                  <div className="text-sm font-bold text-gray-900 group-hover:text-blue-600">Amazon 对撞链接</div>
                  <div className="text-xs text-gray-500 truncate max-w-[200px] mt-1">{candidate.amazon_link || candidate.market_comparison_url || '未提供'}</div>
                </div>
                <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-blue-500" />
              </a>
            </div>
            <div className="mt-4 flex gap-2">
              <Badge variant="default" className="bg-gray-800 text-white">PID: {candidate.source_pid || candidate.product_id_1688}</Badge>
              <Badge variant="default" className="bg-amber-600 text-white">类目: {candidate.category || '未分类'}</Badge>
              <Badge variant="outline" className={candidate.warehouse_anchor ? "border-gray-900" : "border-red-500 text-red-500 font-bold"}>
                发货地: {candidate.warehouse_anchor || '未指定'}
              </Badge>
            </div>
          </section>

        </div>

        {/* Footer Actions */}
        <div className="p-6 border-t border-gray-200 bg-white flex justify-end gap-3">
          <Button onClick={onClose} variant="outline" disabled={loading}>
            取消 (Cancel)
          </Button>
          <Button onClick={() => handleSave(false)} disabled={loading} className="bg-gray-900 hover:bg-black text-white">
            <Save className="w-4 h-4 mr-2" /> 保存 (Save)
          </Button>
          <Button onClick={() => handleSave(true)} disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white font-black shadow-lg shadow-amber-500/20">
            <CheckCircle2 className="w-4 h-4 mr-2" /> 保存即发布 (Save & Publish)
          </Button>
        </div>
      </div>
    </div>
  );
};