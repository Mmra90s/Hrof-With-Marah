/**
 * Supabase Real-time Sync for Huroof Marah
 * =========================================
 * يتزامن مع Supabase مباشرة بدون localStorage
 * شاشة العرض تكتب → الهوست والاعبين يقرأون
 */

(function() {
    'use strict';

    // التكوين
    const CONFIG = {
        SUPABASE_URL: 'https://rzblwgdvtiafqzhvcavr.supabase.co',
        SUPABASE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ6Ymx3Z2R2dGlhZnF6aHZjYXZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTMwMzcsImV4cCI6MjA5MTU4OTAzN30.Dy2ZkzPykeKs55ZVKw5wK_ghhBs8Ibk_-5IHfEJnPE0',
        DEBUG: true
    };

    let supabase = null;
    let sessionId = null;
    let channel = null;
    let isConnected = false;

    // دالة التسجيل
    function log(message, data = null) {
        if (CONFIG.DEBUG) {
            console.log(`[Supabase Sync] ${message}`, data || '');
        }
    }

    // استخراج Session ID من URL
    function getSessionId() {
        const params = new URLSearchParams(window.location.search);
        const id = params.get('session');
        if (!id) {
            // إنشاء session ID جديد إذا لم يكن موجود
            const newId = Math.random().toString(36).substring(2, 15);
            window.history.replaceState({}, '', `?session=${newId}`);
            return newId;
        }
        return id;
    }

    // تحميل Supabase
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

    // الاتصال بـ Supabase والاستماع للتحديثات
    async function connectToSupabase() {
        if (!supabase || !sessionId) return false;

        try {
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

    // معالجة تحديثات Realtime
    function handleRealtimeUpdate(payload) {
        if (!payload.new) return;

        const { key, value } = payload.new;
        log('تحديث من Supabase:', key, value);

        // تحديث localStorage للتوافقية
        localStorage.setItem(key, value);

        // تشغيل حدث مخصص
        window.dispatchEvent(new CustomEvent('supabaseUpdate', {
            detail: { key, value }
        }));

        // تشغيل حدث storage للتوافقية
        window.dispatchEvent(new StorageEvent('storage', {
            key: key,
            newValue: value,
            storageArea: localStorage
        }));
    }

    // تحميل الحالة الأولية
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
                    localStorage.setItem(key, value);
                    window.dispatchEvent(new CustomEvent('supabaseUpdate', {
                        detail: { key, value }
                    }));
                });
            }
        } catch (error) {
            log('خطأ في تحميل الحالة الأولية:', error);
        }
    }

    // كتابة البيانات إلى Supabase
    async function writeToSupabase(key, value) {
        if (!supabase || !sessionId || !isConnected) {
            log('لم يتم الكتابة - الاتصال غير جاهز');
            return false;
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
            return true;
        } catch (error) {
            log('خطأ في الكتابة:', error);
            return false;
        }
    }

    // دالة عامة للكتابة من أي مكان
    window.writeGameData = async function(key, value) {
        await writeToSupabase(key, value);
    };

    // دالة للقراءة من localStorage (للتوافقية)
    window.readGameData = function(key) {
        return localStorage.getItem(key);
    };

    // دالة للاستماع للتحديثات
    window.onGameDataUpdate = function(callback) {
        window.addEventListener('supabaseUpdate', (event) => {
            callback(event.detail.key, event.detail.value);
        });
    };

    // التهيئة
    async function initialize() {
        log('جاري التهيئة...');

        // استخراج Session ID
        sessionId = getSessionId();
        log('Session ID:', sessionId);

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

    // بدء التهيئة عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // تنظيف عند إغلاق الصفحة
    window.addEventListener('beforeunload', () => {
        if (channel) {
            channel.unsubscribe();
        }
    });
})();
