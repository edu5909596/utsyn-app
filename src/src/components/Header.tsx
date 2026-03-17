'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useLocale } from './LocaleProvider';

export default function Header() {
    const { locale, setLocale, t } = useLocale();
    const [menuOpen, setMenuOpen] = useState(false);

    return (
        <>
            <a href="#main-content" className="skip-nav">
                {t('a11y_skip_nav')}
            </a>
            <header className="header" role="banner">
                <div className="header-inner">
                    <Link href="/" className="logo" aria-label="Restaurant Utsyn - Hjem">
                        <span className="logo-icon" aria-hidden="true">U</span>
                        Restaurant Utsyn
                    </Link>

                    <button
                        className="menu-toggle"
                        onClick={() => setMenuOpen(!menuOpen)}
                        aria-expanded={menuOpen}
                        aria-controls="main-nav"
                        aria-label={menuOpen ? 'Lukk meny' : 'Åpne meny'}
                    >
                        {menuOpen ? '✕' : '☰'}
                    </button>

                    <nav id="main-nav" className={`nav ${menuOpen ? 'nav-open' : ''}`} role="navigation" aria-label="Hovednavigasjon">
                        <Link href="/" className="nav-link" onClick={() => setMenuOpen(false)}>
                            {t('nav_home')}
                        </Link>
                        <Link href="/bestill" className="nav-link" onClick={() => setMenuOpen(false)}>
                            {t('nav_book')}
                        </Link>
                        <Link href="/#om-oss" className="nav-link" onClick={() => setMenuOpen(false)}>
                            {t('nav_about')}
                        </Link>
                        <Link href="/#kontakt" className="nav-link" onClick={() => setMenuOpen(false)}>
                            {t('nav_contact')}
                        </Link>
                        <button
                            className="lang-toggle"
                            onClick={() => setLocale(locale === 'no' ? 'en' : 'no')}
                            aria-label={`Switch to ${locale === 'no' ? 'English' : 'Norsk'}`}
                        >
                            {locale === 'no' ? '🇬🇧 EN' : '🇳🇴 NO'}
                        </button>
                    </nav>
                </div>
            </header>
        </>
    );
}
