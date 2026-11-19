document.addEventListener("DOMContentLoaded", function() {
    const style = document.createElement('style');
    style.innerHTML = `
        /* =========================================
           VARIABLES (MODE CLAIR)
           ========================================= */
        .modern-transparent-footer {
            --f-text: #1a1a1a;
            --f-text-muted: #666666;
            --capsule-bg: rgba(255, 255, 255, 0.7);
            --capsule-border: rgba(0, 0, 0, 0.08);
            --capsule-shadow: 0 8px 32px rgba(0, 0, 0, 0.05), inset 0 1px 3px rgba(255, 255, 255, 1);
            --btn-bg: rgba(0, 0, 0, 0.05);
            --btn-hover: rgba(0, 0, 0, 0.09);
            --btn-icon-color: #1a1a1a;
            --primary-glow: 0 6px 20px rgba(168, 85, 247, 0.3);
            
            /* DÉGRADÉ APPLE - CLAIR (Gris profond -> Bleu Apple -> Gris profond) */
            --f-name-grad: linear-gradient(110deg, #1d1d1f 25%, #0071e3 50%, #1d1d1f 75%);

            width: 100% !important;
            margin-top: 40px !important;
            padding: 40px 20px 100px 20px !important; 
            display: flex !important;
            flex-direction: column !important;
            align-items: center !important;
            gap: 32px !important;
            background: transparent !important;
            color: var(--f-text) !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif !important;
            box-sizing: border-box !important;
            position: relative !important;
            z-index: 1000 !important;
        }

        /* =========================================
           VARIABLES MODE SOMBRE
           ========================================= */
        .modern-transparent-footer.footer-dark-mode {
            --f-text: #ffffff;
            --f-text-muted: #a1a1a6;
            --capsule-bg: rgba(30, 30, 35, 0.6); 
            --capsule-border: rgba(255, 255, 255, 0.1);
            --capsule-shadow: 0 10px 40px rgba(0, 0, 0, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.15);
            --btn-bg: rgba(255, 255, 255, 0.1);
            --btn-hover: rgba(255, 255, 255, 0.18);
            --btn-icon-color: #ffffff;
            --primary-glow: 0 0 20px rgba(168, 85, 247, 0.5), 0 0 45px rgba(217, 70, 239, 0.3);
            
            /* DÉGRADÉ APPLE - SOMBRE (Blanc -> Indigo Apple -> Blanc) */
            --f-name-grad: linear-gradient(110deg, #ffffff 25%, #5e5ce6 50%, #ffffff 75%);
        }

        /* =========================================
           UI : CAPSULE ET BOUTONS
           ========================================= */
        .actions-capsule {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            flex-wrap: wrap !important; 
            gap: 10px !important;
            background: var(--capsule-bg) !important;
            border: 1px solid var(--capsule-border) !important;
            padding: 8px 8px 8px 10px !important;
            border-radius: 100px !important;
            backdrop-filter: blur(24px) saturate(180%) !important;
            -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
            box-shadow: var(--capsule-shadow) !important;
            width: auto !important; 
            max-width: 95vw !important;
            box-sizing: border-box !important;
        }

        .action-btn {
            display: inline-flex !important;
            align-items: center !important;
            justify-content: center !important;
            text-decoration: none !important;
            flex: 0 0 auto !important; 
            width: max-content !important; 
            min-width: max-content !important;
            max-width: none !important;
            margin: 0 !important;
            transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1) !important;
        }

        .circle-btn {
            width: 44px !important;
            height: 44px !important;
            min-width: 44px !important;
            border-radius: 50% !important;
            background: var(--btn-bg) !important;
            color: var(--btn-icon-color) !important;
            padding: 0 !important;
        }

        .pill-btn {
            border-radius: 100px !important;
            padding: 10px 20px !important;
            gap: 8px !important;
            font-weight: 600 !important;
            font-size: 0.9rem !important;
            line-height: 1 !important;
        }

        .pill-btn span {
            display: block !important;
            flex: 0 0 auto !important;
            white-space: nowrap !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: inherit !important;
        }

        .secondary-btn { background: var(--btn-bg) !important; color: var(--f-text) !important; }
        .primary-btn {
            background: linear-gradient(135deg, #a855f7, #d946ef) !important;
            color: white !important;
            box-shadow: var(--primary-glow) !important;
            border: 1px solid rgba(255, 255, 255, 0.2) !important;
        }

        .action-btn svg { 
            width: 18px !important; 
            height: 18px !important; 
            min-width: 18px !important;
            display: block !important;
            flex: 0 0 auto !important; 
            transition: transform 0.3s ease !important; 
        }
        .circle-btn svg { width: 20px !important; height: 20px !important; fill: currentColor !important; }
        .secondary-btn svg { fill: none !important; stroke: currentColor !important; stroke-width: 2 !important; stroke-linecap: round !important; stroke-linejoin: round !important; }
        .primary-btn svg { fill: none !important; stroke: white !important; stroke-width: 2 !important; stroke-linecap: round !important; stroke-linejoin: round !important; }

        .capsule-divider { 
            width: 1px !important; 
            height: 28px !important; 
            background: var(--capsule-border) !important; 
            margin: 0 2px !important; 
            flex: 0 0 auto !important;
        }

        /* =========================================
           UI : TEXTES BAS DE PAGE & ANIMATION APPLE
           ========================================= */
        .footer-text-container { text-align: center !important; display: flex !important; flex-direction: column !important; gap: 8px !important; }
        .footer-text-container p { margin: 0 !important; font-size: 0.9rem !important; font-weight: 500 !important; letter-spacing: 0.5px !important; }
        
        .pro-name {
            font-weight: 700 !important; 
            text-transform: uppercase !important;
            letter-spacing: 0.8px !important; /* Espacement premium */
            background: var(--f-name-grad) !important; 
            background-size: 250% auto !important; /* Très large pour un fondu parfait */
            color: transparent !important; 
            -webkit-background-clip: text !important; 
            background-clip: text !important;
            
            /* ANIMATION FLUIDE : 8 secondes, ease-in-out, allers-retours */
            animation: appleFlow 8s ease-in-out infinite alternate !important; 
            display: inline-block !important;
        }
        
        @keyframes appleFlow { 
            0% { background-position: 0% 50%; } 
            100% { background-position: 100% 50%; } 
        }
        
        .footer-copyright { font-size: 0.8rem !important; color: var(--f-text-muted) !important; font-weight: 400 !important; }
    `;
    document.head.appendChild(style);

    const footerHTML = `
        <footer class="modern-transparent-footer">
            <div class="actions-capsule">
                <a href="https://www.linkedin.com/in/amar-bouchareb" target="_blank" rel="noopener noreferrer" class="action-btn circle-btn" title="LinkedIn">
                    <svg viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://amarbcrb.pages.dev" target="_blank" rel="noopener noreferrer" class="action-btn pill-btn secondary-btn" title="Portfolio Personnel">
                    <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                    <span>Portfolio</span>
                </a>
                <div class="capsule-divider"></div>
                <a href="mailto:amarxbcrb@gmail.com" class="action-btn pill-btn primary-btn">
                    <svg viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                    <span>Contact</span>
                </a>
            </div>
            <div class="footer-text-container">
                <p>Design & Développement • <span class="pro-name">Amar Bouchareb</span></p>
                <p class="footer-copyright">&copy; 2026 BioStudy</p>
            </div>
        </footer>
    `;
    document.body.insertAdjacentHTML('beforeend', footerHTML);

    const footer = document.querySelector('.modern-transparent-footer');
    const html = document.documentElement;
    const body = document.body;

    function checkTheme() {
        if (!footer) return;

        const isExplicitlyDark = html.classList.contains('dark') || body.classList.contains('dark') || body.classList.contains('dark-mode') || html.getAttribute('data-theme') === 'dark';
        const isExplicitlyLight = html.classList.contains('light') || body.classList.contains('light') || html.getAttribute('data-theme') === 'light';

        if (isExplicitlyDark) { footer.classList.add('footer-dark-mode'); return; }
        if (isExplicitlyLight) { footer.classList.remove('footer-dark-mode'); return; }

        const mainWrapper = document.getElementById('root') || document.getElementById('app') || document.querySelector('main') || body.firstElementChild;
        if (mainWrapper && mainWrapper !== footer) {
            if (mainWrapper.classList.contains('dark') || mainWrapper.classList.contains('dark-mode')) { footer.classList.add('footer-dark-mode'); return; }
            if (mainWrapper.classList.contains('light') || mainWrapper.classList.contains('light-mode')) { footer.classList.remove('footer-dark-mode'); return; }
        }

        const bodyTextColor = window.getComputedStyle(body).color;
        const textRgb = bodyTextColor.match(/\d+/g);
        if (textRgb && textRgb.length >= 3) {
            const r = parseInt(textRgb[0]), g = parseInt(textRgb[1]), b = parseInt(textRgb[2]);
            const textBrightness = (r * 299 + g * 587 + b * 114) / 1000;
            
            if (textBrightness > 128) {
                footer.classList.add('footer-dark-mode');
                return;
            } else if (textBrightness < 128) {
                footer.classList.remove('footer-dark-mode');
                return;
            }
        }

        let bgColor = window.getComputedStyle(body).backgroundColor;
        if (bgColor === 'rgba(0, 0, 0, 0)' || bgColor === 'transparent') {
            if (mainWrapper) bgColor = window.getComputedStyle(mainWrapper).backgroundColor;
        }
        
        const bgRgb = bgColor.match(/\d+/g);
        if (bgRgb && bgRgb.length >= 3 && bgColor !== 'rgba(0, 0, 0, 0)') {
            const r = parseInt(bgRgb[0]), g = parseInt(bgRgb[1]), b = parseInt(bgRgb[2]);
            const brightness = (r * 299 + g * 587 + b * 114) / 1000;
            brightness < 128 ? footer.classList.add('footer-dark-mode') : footer.classList.remove('footer-dark-mode');
        }
    }

    document.addEventListener('click', () => { checkTheme(); setTimeout(checkTheme, 50); setTimeout(checkTheme, 200); }, true); 
    
    const observer = new MutationObserver(() => { checkTheme(); });
    const observerConfig = { attributes: true, attributeFilter: ['class', 'data-theme'] };
    observer.observe(html, observerConfig);
    observer.observe(body, observerConfig);
    
    const mainWrap = document.getElementById('root') || document.getElementById('app') || document.querySelector('main');
    if (mainWrap) {
        observer.observe(mainWrap, observerConfig);
    }

    checkTheme();
    setTimeout(checkTheme, 150);
});
