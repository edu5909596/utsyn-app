'use client';

import React from 'react';
import { useLocale } from './LocaleProvider';

export default function Footer() {
    const { t } = useLocale();
    const year = new Date().getFullYear();

    return (
        <footer className="footer" role="contentinfo">
            <div className="footer-content">
                <p style={{ fontSize: '1.1rem', opacity: 1, marginBottom: '0.5rem', fontWeight: 600 }}>
                    Restaurant Utsyn
                </p>
                <p>{t('footer_school')}</p>
                <p>© {year} Restaurant Utsyn. {t('footer_rights')}.</p>
            </div>
        </footer>
    );
}
