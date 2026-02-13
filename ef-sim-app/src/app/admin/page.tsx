'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { Loader2, Upload, AlertTriangle, FileText, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';

const IMAGE_BUCKET_URL = process.env.NEXT_PUBLIC_SUPABASE_URL + '/storage/v1/object/public/player-images/';

export default function AdminPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState<string | null>(null);
    const [csvFile, setCsvFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [parseError, setParseError] = useState<string | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{ success: number, fail: number } | null>(null);

    // Access Control
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.replace('/');
                return;
            }

            const { data: roleData } = await supabase.from('user_roles').select('role').eq('user_id', session.user.id).single();
            const role = roleData?.role || null;

            if (role !== 'admin' && role !== 'developer') {
                router.replace('/');
                return;
            }

            setUserRole(role);
            setLoading(false);
        };

        checkAuth();
    }, [router]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setCsvFile(file);
            parseCSV(file);
        }
    };

    const parseCSV = (file: File) => {
        setParseError(null);
        setImportResult(null);
        Papa.parse(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.errors.length > 0) {
                    setParseError('CSVのパースに失敗しました: ' + results.errors[0].message);
                    setParsedData([]);
                    return;
                }

                // Header Mapping (Japanese -> English)
                const headerMap: { [key: string]: string } = {
                    '選手名': 'name', 'カード種別': 'card_type', 'チーム': 'team', '国籍': 'nationality', 'レベル上限': 'max_level',
                    '年齢': 'age', '身長': 'height', '利き足': 'dominant_foot',
                    'オフェンスセンス': 'offensive_awareness', 'ボールコントロール': 'ball_control', 'ドリブル': 'dribbling', 'ボールキープ': 'tight_possession',
                    'グランダーパス': 'low_pass', 'フライパス': 'loft_pass', '決定力': 'finishing', 'ヘッダー': 'heading', 'プレースキック': 'place_kicking',
                    'カーブ': 'curl', 'スピード': 'speed', '瞬発力': 'acceleration', 'キック力': 'kicking_power', 'ジャンプ': 'jump',
                    'フィジカルコンタクト': 'physical_contact', 'ボディコントロール': 'balance', 'スタミナ': 'stamina',
                    'ディフェンスセンス': 'defensive_awareness', 'ボール奪取': 'tackling', 'アグレッシブネス': 'aggression', '守備意識': 'defensive_engagement',
                    'GKセンス': 'gk_awareness', 'キャッチング': 'gk_catching', 'クリアリング': 'gk_clearing', 'コラプシング': 'gk_reflexes', 'ディフレクティング': 'gk_reach',
                    '逆足頻度': 'weak_foot_usage', '逆足精度': 'weak_foot_accuracy', 'コンディション安定度': 'form', 'ケガ耐性': 'injury_resistance',
                    '画像ファイル名': 'image_file_name'
                };

                const rawData = results.data as any[];
                if (rawData.length === 0) {
                    setParseError('データが空です');
                    setParsedData([]);
                    return;
                }

                // Apply Mapping
                const data = rawData.map(row => {
                    const newRow: any = {};
                    Object.keys(row).forEach(key => {
                        const mappedKey = headerMap[key] || key; // Use mapped key or original if not found
                        newRow[mappedKey] = row[key];
                    });
                    return newRow;
                });

                const missingFields = data.some(row => !row.name || !row.card_type);
                if (missingFields) {
                    setParseError('警告: 必須項目 (name/選手名, card_type/カード種別) が欠けている行があります。これらの行はスキップされるかエラーになる可能性があります。');
                }

                console.log('Parsed Data:', data);
                setParsedData(data);
            },
            error: (error) => {
                setParseError('読み込みエラー: ' + error.message);
            }
        });
    };

    const handleImport = async () => {
        if (!parsedData.length || !confirm(`プレビューの ${parsedData.length} 件のデータをインポートしますか？\n(既存の同名・同タイプ選手は上書きされます)`)) return;

        setIsImporting(true);
        let successCount = 0;
        let failCount = 0;

        // Bulk Upsert is more efficient, but let's do it in chunks if very large.
        // For now, simple bulk upsert.
        // We need to make sure empty strings are treated as null or appropriate types for numbers if strictly typed?
        // Supabase might complain if we try to insert '' into a numeric column.
        // Let's sanitize data a bit.

        const sanitizedData = parsedData.map(row => {
            const newRow: any = { ...row };

            // Phase 21: Map image_file_name to evidence_url
            if (newRow.image_file_name && newRow.image_file_name.trim() !== '') {
                newRow.evidence_url = IMAGE_BUCKET_URL + newRow.image_file_name.trim();
                // cleanup temp field if you want, or just leave it. upsert ignores extra fields if not in table? 
                // Supabase JS client usually ignores fields not in the table if checks are off, but strict mode might fail.
                // Safest to remove it if it's not in the schema.
                delete newRow.image_file_name;
            }

            // Convert numeric columns
            ['offensive_awareness', 'ball_control', 'dribbling', 'tight_possession', 'low_pass', 'loft_pass', 'finishing', 'heading', 'place_kicking', 'curl', 'speed', 'acceleration', 'kicking_power', 'jump', 'physical_contact', 'balance', 'stamina', 'defensive_awareness', 'tackling', 'aggression', 'defensive_engagement', 'gk_awareness', 'gk_catching', 'gk_clearing', 'gk_reflexes', 'gk_reach', 'weak_foot_usage', 'weak_foot_accuracy', 'form', 'injury_resistance', 'age', 'height', 'max_level']
                .forEach(key => {
                    if (newRow[key] && !isNaN(Number(newRow[key]))) {
                        newRow[key] = Number(newRow[key]);
                    } else if (newRow[key] === '') {
                        newRow[key] = null;
                    }
                });
            return newRow;
        });

        try {
            const { error, count } = await supabase
                .from('players')
                .upsert(sanitizedData, { onConflict: 'name,card_type', ignoreDuplicates: false });
            // ignoreDuplicates: false means it updates on conflict.

            if (error) throw error;
            successCount = sanitizedData.length; // Assuming all succeeded if no error for bulk op
            alert(`${successCount} 件のインポートに成功しました`);
            setImportResult({ success: successCount, fail: 0 });
            setCsvFile(null);
            setParsedData([]);
        } catch (err: any) {
            console.error('Import Error:', err);
            alert('インポートに失敗しました: ' + err.message);
            failCount = parsedData.length;
            setImportResult({ success: 0, fail: failCount });
        } finally {
            setIsImporting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-blue-600" /></div>;

    return (
        <div className="min-h-screen bg-gray-100 flex font-sans">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 text-white flex-shrink-0 hidden md:block">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold tracking-wider">ADMIN</h1>
                    <p className="text-xs text-slate-400 mt-1">eFootball Simulator</p>
                </div>
                <nav className="p-4 space-y-2">
                    <Link href="/admin" className="flex items-center gap-3 px-4 py-3 bg-blue-600 rounded-lg text-sm font-bold shadow-lg shadow-blue-900/50">
                        <Upload className="w-4 h-4" /> CSVインポート
                    </Link>
                    <Link href="/admin/boosters" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
                        💎 ブースター管理
                    </Link>
                    <Link href="/admin/skills" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors">
                        ⚽ スキル管理
                    </Link>
                    <Link href="/" className="flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg text-sm font-medium transition-colors mt-4 border-t border-slate-800">
                        <ArrowLeft className="w-4 h-4" /> トップに戻る
                    </Link>
                </nav>
            </aside>

            {/* Mobile Header (visible only on small screens) */}
            {/* Skipped for brevity, focusing on functionality as requested */}

            {/* Main Content */}
            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-2">
                        <Upload className="w-6 h-6 text-blue-600" />
                        選手データ一括インポート
                    </h2>

                    {/* Import Card */}
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-gray-700">CSVアップロード</h3>
                                <p className="text-xs text-gray-500 mt-1">
                                    ヘッダー行が必要です (name, card_type, team, ...)。<br />
                                    同名・同タイプ ("card_type") の選手は上書きされます。<br />
                                    ※ <code>image_file_name</code> / <code>画像ファイル名</code> 列にファイル名 (例: <code>messi.jpg</code>) を指定すると自動で画像紐付けされます。
                                </p>
                                <div className="mt-2 text-xs bg-amber-50 text-amber-800 p-2 rounded border border-amber-200">
                                    <strong>【画像連携の注意点】</strong>
                                    <ul className="list-disc list-inside mt-1 space-y-0.5">
                                        <li>画像ファイル名には <strong>半角英数字</strong> の使用を推奨します（例: <code>messi_bt.jpg</code>）。</li>
                                        <li>CSVの入力値とStorageのファイル名は <strong>拡張子(.jpg等)まで含めて完全に一致</strong> させてください。</li>
                                        <li>日本語ファイル名は文字化けの原因になるため非推奨です。</li>
                                    </ul>
                                </div>
                            </div>
                            <a href="/template_players.csv" download className="text-xs text-blue-600 hover:underline flex items-center gap-1 font-bold bg-blue-50 px-3 py-2 rounded hover:bg-blue-100 transition">
                                <FileText className="w-3 h-3" /> テンプレートCSV (日本語ヘッダー)
                            </a>
                        </div>

                        <div className="p-8">
                            {!parsedData.length ? (
                                <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-xl hover:bg-gray-50 transition-colors relative">
                                    <input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleFileChange}
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    />
                                    <Upload className="w-12 h-12 text-gray-300 mb-4" />
                                    <p className="text-gray-600 font-bold mb-1">CSVファイルをドラッグ＆ドロップ</p>
                                    <p className="text-sm text-gray-400">またはクリックして選択</p>
                                </div>
                            ) : (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg border border-blue-100">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-100 p-2 rounded-full">
                                                <FileText className="w-5 h-5 text-blue-600" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-800">{csvFile?.name}</p>
                                                <p className="text-xs text-gray-500">{parsedData.length} 行のデータが見つかりました</p>
                                            </div>
                                        </div>
                                        <button onClick={() => { setParsedData([]); setCsvFile(null); setParseError(null); }} className="text-gray-400 hover:text-red-500 p-2">
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>

                                    {parseError && (
                                        <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-start gap-3 border border-amber-200">
                                            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                                            <div className="text-sm">{parseError}</div>
                                        </div>
                                    )}

                                    {/* Preview Table */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-gray-100 text-gray-600 font-bold border-b">
                                                    <tr>
                                                        <th className="px-4 py-2">#</th>
                                                        {Object.keys(parsedData[0] || {}).slice(0, 6).map(key => (
                                                            <th key={key} className="px-4 py-2 whitespace-nowrap">{key}</th>
                                                        ))}
                                                        {Object.keys(parsedData[0] || {}).length > 6 && <th className="px-4 py-2">...</th>}
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {parsedData.slice(0, 5).map((row, i) => (
                                                        <tr key={i} className="hover:bg-gray-50">
                                                            <td className="px-4 py-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                                                            {Object.values(row).slice(0, 6).map((val: any, j) => (
                                                                <td key={j} className="px-4 py-2 max-w-[150px] truncate text-gray-800">
                                                                    {val}
                                                                </td>
                                                            ))}
                                                            {Object.keys(row).length > 6 && <td className="px-4 py-2 text-gray-400">...</td>}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                        {parsedData.length > 5 && (
                                            <div className="bg-gray-50 px-4 py-2 text-xs text-center text-gray-500 border-t">
                                                残り {parsedData.length - 5} 件...
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                                        <button
                                            onClick={() => { setParsedData([]); setCsvFile(null); setParseError(null); }}
                                            className="px-6 py-2 bg-white border border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-50 transition"
                                        >
                                            キャンセル
                                        </button>
                                        <button
                                            onClick={handleImport}
                                            disabled={isImporting || !!parseError?.startsWith('CSV')}
                                            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition flex items-center gap-2 shadow-lg shadow-blue-200"
                                        >
                                            {isImporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                                            インポート実行
                                        </button>
                                    </div>
                                </div>
                            )}

                            {importResult && (
                                <div className={`mt-6 p-4 rounded-lg flex items-center gap-3 border ${importResult.fail > 0 ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-green-50 text-green-800 border-green-200'}`}>
                                    {importResult.fail > 0 ? <AlertTriangle className="w-5 h-5" /> : <CheckCircle className="w-5 h-5" />}
                                    <div>
                                        <p className="font-bold">処理完了</p>
                                        <p className="text-sm">成功: {importResult.success}件 / 失敗: {importResult.fail}件</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Helper icons
function ArrowLeft({ className }: { className?: string }) {
    return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></svg>;
}
