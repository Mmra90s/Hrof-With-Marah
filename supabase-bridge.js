/**
 * Supabase Bridge for Huroof Marah
 * ================================
 * هذا السكريبت يعمل كجسر بين localStorage و Supabase Realtime
 * بدون أي تعديل على الملفات الأصلية أو التصميم
 * 
 * كيفية الاستخدام:
 * 1. أضف هذا السكريبت إلى أي صفحة HTML:
 *    <script src="supabase-bridge.js"></script>
 * 2. حدّث SUPABASE_URL و SUPABASE_KEY بقيمك
 * 3. كل شيء سيعمل تلقائياً في الخلفية
 */

(function() {
    'use strict';

    // ========== التكوين ==========
    const CONFIG = {
        SUPABASE_URL: 'https://rzblwgdvtiafqzhvcavr.supabase.co',
        SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6Ymx3Z2R2dGlhZnF6aHZjYXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTMwMzcsImV4cCI6MjA5MTU4OTAzN30.Dy2ZkzPykeKs55ZVKw5wK_ghhBs8Ibk_-5IHfEJnPE0',
        DEBUG: false // غيّر إلى true لرؤية رسائل التصحيح
    };

    // ========== المتغيرات العامة ==========
    let supabase = null;
    let sessionId = null;
    let channel = null;
    let isConnected = false;
    const originalSetItem = localStorage.setItem;
    const originalRemoveItem = localStorage.removeItem;

    // ========== دالة التسجيل ==========
    function log(message, data = null) {
        if (CONFIG.DEBUG) {
            console.log(`[Supabase Bridge] ${message}`, data || '');
        }
    }

    // ========== استخراج Session ID ==========
    function getSessionId() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('session');
        if (!id) {
            log('تحذير: لم يتم العثور على Session ID في URL');
            return null;
        }
        log('Session ID:', id);
        return id;
    }

    // ========== تحميل Supabase ==========
    function loadSupabase() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
            script.onload = () => {
                try {
                    const { createClient } = window.supabase;
                    supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_KEY);
                    log('تم تحميل Supabase بنجاح');
                    resolve(supabase);
                } catch (error) {
                    log('خطأ في تحميل Supabase:', error);
                    reject(error);
                }
            };
            script.onerror = () => {
                log('فشل تحميل مكتبة Supabase');
                reject(new Error('Failed to load Supabase'));
            };
            document.head.appendChild(script);
        });
    }

    // ========== الاتصال بـ Supabase ==========
    async function connectToSupabase() {
        if (!supabase || !sessionId) return false;

        try {
            // الاشتراك في قناة Realtime
            channel = supabase
                .channel(`game-${sessionId}`)
                .on(
                    'postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'game_state',
                        filter: `session_id=eq.${sessionId}`
                    },
                    (payload) => {
                        handleRealtimeUpdate(payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        isConnected = true;
                        log('تم الاتصال بـ Supabase Realtime');
                        loadInitialState();
                    } else if (status === 'CHANNEL_ERROR') {
                        log('خطأ في الاتصال بالقناة');
                    }
                });

            return true;
        } catch (error) {
            log('خطأ في الاتصال:', error);
            return false;
        }
    }

    // ========== معالجة تحديثات Realtime ==========
    function handleRealtimeUpdate(payload) {
        if (!payload.new) return;

        const { key, value } = payload.new;
        log('تحديث من Supabase:', key);

        // تحديث localStorage بدون تشغيل الـ override
        originalSetItem.call(localStorage, key, value);

        // تشغيل حدث storage للنوافذ الأخرى
        window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            newValue: value,
            storageArea: localStorage
        }));
    }

    // ========== تحميل الحالة الأولية ==========
    async function loadInitialState() {
        if (!supabase || !sessionId) return;

        try {
            const { data, error } = await supabase
                .from('game_state')
                .select('key, value')
                .eq('session_id', sessionId);

            if (error) throw error;

            if (data && data.length > 0) {
                log(`تم تحميل ${data.length} عنصر من الحالة الأولية`);
                data.forEach(({ key, value }) => {
                    originalSetItem.call(localStorage, key, value);
                });
            }
        } catch (error) {
            log('خطأ في تحميل الحالة الأولية:', error);
        }
    }

    // ========== مزامنة إلى Supabase ==========
    async function syncToSupabase(key, value) {
        if (!supabase || !sessionId || !isConnected) {
            log('لم يتم المزامنة - الاتصال غير جاهز');
            return;
        }

        try {
            // البحث عن السجل الموجود
            const { data: existing, error: selectError } = await supabase
                .from('game_state')
                .select('id')
                .eq('session_id', sessionId)
                .eq('key', key)
                .single();

            if (selectError && selectError.code !== 'PGRST116') {
                // PGRST116 = لا توجد صفوف
                throw selectError;
            }

            if (existing) {
                // تحديث السجل الموجود
                await supabase
                    .from('game_state')
                    .update({ value, updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                log('تم تحديث:', key);
            } else {
                // إدراج سجل جديد
                await supabase
                    .from('game_state')
                    .insert({
                        session_id: sessionId,
                        key,
                        value,
                        updated_at: new Date().toISOString()
                    });
                log('تم إدراج:', key);
            }
        } catch (error) {
            log('خطأ في المزامنة:', error);
        }
    }

    // ========== Override localStorage.setItem ==========
    localStorage.setItem = function(key, value) {
        // تحديث localStorage محلياً أولاً
        originalSetItem.call(this, key, value);

        // إذا كان المفتاح متعلقاً بـ Session ID، مزامن إلى Supabase
        if (key.includes(sessionId)) {
            syncToSupabase(key, value);
        }
    };

    // ========== Override localStorage.removeItem ==========
    localStorage.removeItem = function(key) {
        originalRemoveItem.call(this, key);

        // حذف من Supabase أيضاً
        if (key.includes(sessionId) && supabase && sessionId) {
            supabase
                .from('game_state')
                .delete()
                .eq('session_id', sessionId)
                .eq('key', key)
                .then(() => log('تم حذف:', key))
                .catch(error => log('خطأ في الحذف:', error));
        }
    };

    // ========== التهيئة ==========
    async function initialize() {
        log('جاري التهيئة...');

        // استخراج Session ID
        sessionId = getSessionId();
        if (!sessionId) {
            log('تحذير: لا يمكن المتابعة بدون Session ID');
            return;
        }

        // تحميل Supabase
        try {
            await loadSupabase();
            log('تم تحميل Supabase');
        } catch (error) {
            log('فشل تحميل Supabase:', error);
            return;
        }

        // الاتصال بـ Supabase
        const connected = await connectToSupabase();
        if (connected) {
            log('تم الاتصال بنجاح');
        } else {
            log('فشل الاتصال');
        }
    }

    // ========== بدء التهيئة عند تحميل الصفحة ==========
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // ========== تنظيف عند إغلاق الصفحة ==========
    window.addEventListener('beforeunload', () => {
        if (channel) {
            channel.unsubscribe();
        }
    });
})();
