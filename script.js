// Dark mode functionality with glitch effect
function initializeDarkMode() {
    const darkModeToggle = document.getElementById('dark-mode-toggle');
    const darkModeToggleMobile = document.getElementById('dark-mode-toggle-mobile');
    const themeIcon = document.getElementById('theme-icon');
    const themeIconMobile = document.getElementById('theme-icon-mobile');

    const currentTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', currentTheme);
    updateThemeIcon(currentTheme);

    // --- Glitch state ---
    let isGlitching = false;
    let isCooldown = false;
    let activeIntervals = [];
    let glitchEndTimeout = null;
    let cooldownTimeout = null;
    let activeTextGlitchers = [];
    let activeOverlay = null;

    const GLITCH_TYPES = ['glitch-horizontal', 'glitch-vertical', 'glitch-diagonal', 'glitch-rotate', 'glitch-pulse', 'glitch-flicker'];
    const CHAR_POOLS = [
        '!@#$%^&*()_+-=[]{}|;:,.<>?~`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖØÙÚÛÜÝÞßàáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ',
        '©®±×÷§¶°¢£¥¤¡¿«»¦¬¯´¸µ¾¼½¹³²¹°'
    ];

    // Fully resets all glitch state and removes all glitch DOM effects
    function cleanup() {
        activeIntervals.forEach(id => clearInterval(id));
        activeIntervals = [];
        if (glitchEndTimeout) { clearTimeout(glitchEndTimeout); glitchEndTimeout = null; }
        if (cooldownTimeout) { clearTimeout(cooldownTimeout); cooldownTimeout = null; }

        activeTextGlitchers.forEach(g => g.stop());
        activeTextGlitchers = [];

        if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }

        const allClasses = [...GLITCH_TYPES, 'glitch-text'];
        document.querySelectorAll(allClasses.map(c => '.' + c).join(',')).forEach(el => {
            allClasses.forEach(c => el.classList.remove(c));
            el.style.animationDelay = '';
            el.style.animationDuration = '';
        });

        isGlitching = false;
        isCooldown = false;
    }

    function shuffle(arr) {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }

    // Creates a character-level glitch on one element; returns { stop }
    function makeTextGlitcher(element) {
        const text = element.textContent;
        if (!text || !text.trim()) return null;

        const originalHTML = element.innerHTML;

        // Collect live text nodes to update in-place (preserves HTML structure)
        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        let node;
        while ((node = walker.nextNode())) {
            textNodes.push({ node, length: node.textContent.length });
        }

        // Per-character state — only non-leading, non-space chars are eligible to glitch
        const now = Date.now();
        const chars = Array.from(text).map((char, i) => ({
            original: char,
            current: char,
            canGlitch: char !== ' ' && i > 0 && text[i - 1] !== ' ',
            isGlitching: false,
            nextGlitch: now + Math.random() * 200,  // staggered start (0–200ms)
            endGlitch: 0
        }));

        // Limit glitching to 20–40% of eligible chars
        const eligible = chars.reduce((acc, c, i) => { if (c.canGlitch) acc.push(i); return acc; }, []);
        shuffle(eligible);
        const limit = Math.floor(eligible.length * (0.2 + Math.random() * 0.2));
        eligible.slice(limit).forEach(i => { chars[i].canGlitch = false; });

        let poolIndex = Math.floor(Math.random() * CHAR_POOLS.length);

        // Rotate character pool every 300ms for variety
        const poolRotateId = setInterval(() => {
            poolIndex = Math.floor(Math.random() * CHAR_POOLS.length);
        }, 300);
        activeIntervals.push(poolRotateId);

        // Main render loop at 50ms — drives character state machine
        const renderId = setInterval(() => {
            const t = Date.now();
            const pool = CHAR_POOLS[poolIndex];

            chars.forEach(c => {
                if (!c.canGlitch) return;
                if (!c.isGlitching && t >= c.nextGlitch) {
                    // Start glitch: active for 100–300ms
                    c.isGlitching = true;
                    c.endGlitch = t + 100 + Math.random() * 200;
                } else if (c.isGlitching && t >= c.endGlitch) {
                    // End glitch: restore original, schedule next (50–200ms later)
                    c.isGlitching = false;
                    c.current = c.original;
                    c.nextGlitch = t + 50 + Math.random() * 150;
                } else if (c.isGlitching && Math.random() < 0.5) {
                    // While glitching: 50% chance to swap to a random char each frame
                    c.current = pool[Math.floor(Math.random() * pool.length)];
                }
            });

            // Apply to DOM text nodes
            let ci = 0;
            textNodes.forEach(({ node, length }) => {
                node.textContent = chars.slice(ci, ci + length).map(c => c.current).join('');
                ci += length;
            });
        }, 50);
        activeIntervals.push(renderId);

        return {
            stop() {
                clearInterval(poolRotateId);
                clearInterval(renderId);
                element.innerHTML = originalHTML;
            }
        };
    }

    function triggerGlitchEffect() {
        if (isGlitching || isCooldown) return;
        isGlitching = true;

        const smallEls = document.querySelectorAll(
            'h1:not(#contact h2), h3, h4, h5, h6, p:not(#contact p), span:not(#contact span), ' +
            'a:not(#contact a), button:not(#contact button), .skill-list li, .tech-badge, ' +
            '.card__icon, i:not(#contact i), .nav-link'
        );
        const textEls = document.querySelectorAll(
            'h1:not(#contact h2), h3, h4, p:not(#contact p), span:not(#contact span), a:not(#contact a)'
        );

        // Character-level glitching on text elements
        textEls.forEach(el => {
            const glitcher = makeTextGlitcher(el);
            if (glitcher) activeTextGlitchers.push(glitcher);
        });

        // Group elements by visual line (20px bands); apply the same CSS animation to each group
        const lineGroups = {};
        smallEls.forEach(el => {
            const key = Math.floor(el.getBoundingClientRect().top / 20);
            (lineGroups[key] = lineGroups[key] || []).push(el);
        });

        Object.values(lineGroups).forEach(group => {
            const type = GLITCH_TYPES[Math.floor(Math.random() * GLITCH_TYPES.length)];
            const delay = Math.random() * 0.1;
            const duration = 0.1 + Math.random() * 0.2;
            group.forEach(el => {
                el.classList.add(type);
                el.style.animationDelay = `${delay}s`;
                el.style.animationDuration = `${duration}s`;
            });
        });

        // RGB split text-shadow
        textEls.forEach(el => el.classList.add('glitch-text'));

        // Full-screen color sweep overlay
        activeOverlay = document.createElement('div');
        activeOverlay.className = 'glitch-overlay';
        document.body.appendChild(activeOverlay);

        // End glitch after 600ms, then enter 300ms cooldown before next trigger is allowed
        glitchEndTimeout = setTimeout(() => {
            glitchEndTimeout = null;

            activeTextGlitchers.forEach(g => g.stop());
            activeTextGlitchers = [];

            smallEls.forEach(el => {
                GLITCH_TYPES.forEach(c => el.classList.remove(c));
                el.style.animationDelay = '';
                el.style.animationDuration = '';
            });
            textEls.forEach(el => el.classList.remove('glitch-text'));

            if (activeOverlay) { activeOverlay.remove(); activeOverlay = null; }

            activeIntervals.forEach(id => clearInterval(id));
            activeIntervals = [];

            isGlitching = false;

            isCooldown = true;
            cooldownTimeout = setTimeout(() => {
                isCooldown = false;
                cooldownTimeout = null;
            }, 300);
        }, 600);
    }

    function toggleTheme() {
        triggerGlitchEffect();
        setTimeout(() => {
            const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(newTheme);
        }, 300);
    }

    function updateThemeIcon(theme) {
        const [add, remove] = theme === 'dark' ? ['fa-sun', 'fa-moon'] : ['fa-moon', 'fa-sun'];
        if (themeIcon) { themeIcon.classList.remove(remove); themeIcon.classList.add(add); }
        if (themeIconMobile) { themeIconMobile.classList.remove(remove); themeIconMobile.classList.add(add); }
    }

    if (darkModeToggle) darkModeToggle.addEventListener('click', toggleTheme);
    if (darkModeToggleMobile) darkModeToggleMobile.addEventListener('click', toggleTheme);

    // Emergency stop shortcut (Ctrl+Shift+G) — kept inside to access closure state
    document.addEventListener('keydown', e => {
        if (e.ctrlKey && e.shiftKey && e.key === 'G') cleanup();
    });

    // Safety net: remove any stuck glitch classes while system is idle
    setInterval(() => {
        if (isGlitching || isCooldown) return;
        const stuck = document.querySelectorAll([...GLITCH_TYPES, 'glitch-text'].map(c => '.' + c).join(','));
        stuck.forEach(el => {
            [...GLITCH_TYPES, 'glitch-text'].forEach(c => el.classList.remove(c));
            el.style.animationDelay = '';
            el.style.animationDuration = '';
        });
    }, 3000);
}

// Scroll progress indicator
function updateScrollProgress() {
    const progressIndicator = document.getElementById('progress-indicator');
    if (progressIndicator) {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollProgress = (scrollTop / scrollHeight) * 100;
        progressIndicator.style.width = `${scrollProgress}%`;
    }
}

window.addEventListener('scroll', updateScrollProgress);
window.addEventListener('resize', updateScrollProgress);
const typingTexts = [
    "Mechatronics Engineer",
    "Robotics Specialist", 
    "Control Systems Developer",
    "Autonomous Systems Engineer"
];
let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
let typingSpeed = 100;

function typeWriter() {
    const currentText = typingTexts[textIndex];
    const typingElement = document.getElementById('typing-text');
    
    if (!typingElement) return;
    
    if (isDeleting) {
        typingElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
        typingSpeed = 50;
    } else {
        typingElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
        typingSpeed = 100;
    }
    
    if (!isDeleting && charIndex === currentText.length) {
        typingSpeed = 2000;
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % typingTexts.length;
        typingSpeed = 500;
    }
    
    setTimeout(typeWriter, typingSpeed);
}

// Mobile menu toggle
document.addEventListener('DOMContentLoaded', function() {
    // Initialize dark mode first
    initializeDarkMode();
    
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });
    }
    
    // Close mobile menu when clicking on a link
    const mobileLinks = mobileMenu?.querySelectorAll('a');
    mobileLinks?.forEach(link => {
        link.addEventListener('click', function() {
            mobileMenu.classList.add('hidden');
        });
    });
    
    // Start typing effect
    typeWriter();
    
    // Initialize fade-in animations
    initializeFadeIn();
    
    // Initialize smooth scrolling
    initializeSmoothScroll();
    
    // Initialize scroll-based animations
    initializeScrollAnimations();
});

// Fade in animation on scroll
function initializeFadeIn() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
            }
        });
    }, observerOptions);
    
    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(element => {
        observer.observe(element);
    });
}

// Smooth scrolling for navigation links
function initializeSmoothScroll() {
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href').substring(1);
            const targetElement = document.getElementById(targetId);
            
            if (targetElement) {
                const offsetTop = targetElement.offsetTop - 80; // Account for fixed nav
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });
}

// Scroll-based animations
function initializeScrollAnimations() {
    let lastScrollTop = 0;
    const nav = document.querySelector('nav');
    
    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Hide/show nav on scroll
        if (scrollTop > lastScrollTop && scrollTop > 100) {
            nav.style.transform = 'translateY(-100%)';
        } else {
            nav.style.transform = 'translateY(0)';
        }
        
        lastScrollTop = scrollTop <= 0 ? 0 : scrollTop;
        
        // Add shadow to nav on scroll
        if (scrollTop > 10) {
            nav.classList.add('shadow-lg');
        } else {
            nav.classList.remove('shadow-lg');
        }
    });
}

// Active navigation highlighting
function updateActiveNavigation() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let current = '';
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (window.pageYOffset >= (sectionTop - 100)) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('text-purple-600');
        link.style.color = 'var(--text-primary)';
        if (link.getAttribute('href') === `#${current}`) {
            link.style.color = '#9333ea'; // purple-600
        }
    });
}

window.addEventListener('scroll', updateActiveNavigation);

// Add hover effect to skill cards
document.addEventListener('DOMContentLoaded', function() {
    const skillCards = document.querySelectorAll('.card-hover');
    
    skillCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-8px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
});

// Parallax effect for hero section
window.addEventListener('scroll', function() {
    const scrolled = window.pageYOffset;
    const heroSection = document.querySelector('#home');
    
    if (heroSection) {
        heroSection.style.transform = `translateY(${scrolled * 0.5}px)`;
    }
});

// Add loading animation
window.addEventListener('load', function() {
    document.body.classList.add('loaded');
    
    // Animate skill bars when visible
    const skillBars = document.querySelectorAll('.skill-bar');
    const skillObserver = new IntersectionObserver(function(entries) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const width = entry.target.getAttribute('data-width');
                entry.target.style.width = width;
            }
        });
    }, { threshold: 0.5 });
    
    skillBars.forEach(bar => {
        skillObserver.observe(bar);
    });
});

// Contact form validation (if contact form is added later)
function validateContactForm(formData) {
    const errors = [];
    
    if (!formData.name || formData.name.trim() === '') {
        errors.push('Name is required');
    }
    
    if (!formData.email || !isValidEmail(formData.email)) {
        errors.push('Valid email is required');
    }
    
    if (!formData.message || formData.message.trim() === '') {
        errors.push('Message is required');
    }
    
    return errors;
}

function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

// Console Easter egg
console.log('%c Welcome to Ganbat Selenge\'s Portfolio! ', 'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-size: 16px; padding: 10px; border-radius: 5px;');
console.log('%c Built with modern web technologies: HTML5, CSS3, JavaScript, Tailwind CSS', 'color: #667eea; font-size: 12px;');
