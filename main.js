/* ================================================================
   LUMA SEMICONDUCTOR — Interactivity & Animation
   main.js
   ================================================================ */

'use strict';

/* ----------------------------------------------------------------
   1. CIRCUIT CANVAS ANIMATION
   ---------------------------------------------------------------- */
class CircuitAnimation {
    constructor() {
        this.canvas = document.getElementById('circuit-canvas');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.traces   = [];
        this.rafId    = null;
        this.W = 0;
        this.H = 0;

        this.init();
        window.addEventListener('resize', () => this.onResize());
    }

    init() {
        this.resize();
        this.buildTraces();
        this.spawnParticles();
        this.loop();
    }

    resize() {
        this.W = this.canvas.offsetWidth;
        this.H = this.canvas.offsetHeight;
        this.canvas.width  = this.W;
        this.canvas.height = this.H;
    }

    onResize() {
        cancelAnimationFrame(this.rafId);
        this.resize();
        this.buildTraces();
        this.spawnParticles();
        this.loop();
    }

    // Define PCB-style traces as normalized [0-1] coordinate paths
    buildTraces() {
        const W = this.W, H = this.H;

        const rawPaths = [
            // Long diagonal-avoiding traces (horizontal + vertical only)
            [[0.0, 0.18], [0.22, 0.18], [0.22, 0.42], [0.48, 0.42]],
            [[0.1, 0.72], [0.1,  0.38], [0.38, 0.38], [0.38, 0.12], [0.65, 0.12]],
            [[0.55, 0.55], [0.55, 0.28], [0.88, 0.28]],
            [[0.32, 0.88], [0.32, 0.60], [0.72, 0.60], [0.72, 0.32], [1.0, 0.32]],
            [[0.0,  0.58], [0.16, 0.58], [0.16, 0.82], [0.44, 0.82]],
            [[0.62, 0.08], [0.62, 0.48], [0.92, 0.48]],
            [[0.28, 0.95], [0.28, 0.68], [0.60, 0.68], [0.60, 0.90], [0.85, 0.90]],
            [[0.0,  0.92], [0.12, 0.92], [0.12, 0.50], [0.30, 0.50]],
            [[0.95, 0.62], [0.70, 0.62], [0.70, 0.20]],
            [[0.50, 0.97], [0.50, 0.75], [0.82, 0.75], [0.82, 0.58]],
            [[0.0,  0.05], [0.45, 0.05], [0.45, 0.22]],
            [[0.78, 0.02], [0.78, 0.18], [1.0,  0.18]],
        ];

        this.traces = rawPaths.map(path => {
            const points   = path.map(([rx, ry]) => ({ x: rx * W, y: ry * H }));
            const segments = [];
            let totalLength = 0;

            for (let i = 0; i < points.length - 1; i++) {
                const a   = points[i];
                const b   = points[i + 1];
                const len = Math.hypot(b.x - a.x, b.y - a.y);
                segments.push({ a, b, len, startDist: totalLength });
                totalLength += len;
            }
            return { points, segments, totalLength };
        });
    }

    spawnParticles() {
        this.particles = [];
        this.traces.forEach((trace, i) => {
            const count = Math.random() > 0.35 ? 2 : 1;
            for (let j = 0; j < count; j++) {
                this.particles.push({
                    traceIdx: i,
                    progress: Math.random(),
                    speed: 0.00025 + Math.random() * 0.0003,
                    alpha:  0.7 + Math.random() * 0.3,
                    size:   1.8 + Math.random() * 1.4,
                    trail:  [],
                    trailMax: 18 + Math.floor(Math.random() * 12),
                });
            }
        });
    }

    getPosOnTrace(trace, progress) {
        const targetDist = progress * trace.totalLength;
        for (const seg of trace.segments) {
            if (targetDist <= seg.startDist + seg.len + 0.001) {
                const t  = Math.min((targetDist - seg.startDist) / seg.len, 1);
                return {
                    x: seg.a.x + (seg.b.x - seg.a.x) * t,
                    y: seg.a.y + (seg.b.y - seg.a.y) * t,
                };
            }
        }
        const last = trace.points[trace.points.length - 1];
        return { x: last.x, y: last.y };
    }

    loop() {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.W, this.H);

        // Draw trace paths (light-theme: subtle deep-blue lines on white)
        this.traces.forEach(trace => {
            ctx.beginPath();
            ctx.moveTo(trace.points[0].x, trace.points[0].y);
            for (let i = 1; i < trace.points.length; i++) {
                ctx.lineTo(trace.points[i].x, trace.points[i].y);
            }
            ctx.strokeStyle = 'rgba(30, 96, 213, 0.10)';
            ctx.lineWidth   = 1;
            ctx.stroke();

            // Junction nodes (interior corners only)
            trace.points.forEach((pt, idx) => {
                if (idx > 0 && idx < trace.points.length - 1) {
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, 2.5, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(30, 96, 213, 0.20)';
                    ctx.fill();
                }
            });
        });

        // Update & draw particles (light-theme: deep blue on white)
        this.particles.forEach(p => {
            p.progress += p.speed;
            if (p.progress > 1) p.progress = 0;

            const pos = this.getPosOnTrace(this.traces[p.traceIdx], p.progress);
            p.trail.push({ ...pos });
            if (p.trail.length > p.trailMax) p.trail.shift();

            // Trail
            if (p.trail.length > 1) {
                for (let i = 1; i < p.trail.length; i++) {
                    const alpha = (i / p.trail.length) * 0.35 * p.alpha;
                    ctx.beginPath();
                    ctx.moveTo(p.trail[i - 1].x, p.trail[i - 1].y);
                    ctx.lineTo(p.trail[i].x,     p.trail[i].y);
                    ctx.strokeStyle = `rgba(30, 96, 213, ${alpha})`;
                    ctx.lineWidth   = p.size * 0.7;
                    ctx.stroke();
                }
            }

            // Outer glow (soft blue halo on white)
            const grd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, p.size * 5);
            grd.addColorStop(0,   `rgba(30, 96, 213, ${0.30 * p.alpha})`);
            grd.addColorStop(0.5, `rgba(30, 96, 213, ${0.08 * p.alpha})`);
            grd.addColorStop(1,   'rgba(30, 96, 213, 0)');
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, p.size * 5, 0, Math.PI * 2);
            ctx.fillStyle = grd;
            ctx.fill();

            // Core dot — solid deep blue
            ctx.beginPath();
            ctx.arc(pos.x, pos.y, p.size, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(20, 72, 200, ${p.alpha})`;
            ctx.fill();
        });

        this.rafId = requestAnimationFrame(() => this.loop());
    }
}


/* ----------------------------------------------------------------
   2. NAVIGATION — scroll behaviour + mobile toggle
   ---------------------------------------------------------------- */
function initNav() {
    const navbar     = document.getElementById('navbar');
    const mobileBtn  = document.getElementById('mobile-menu-btn');
    const navLinks   = document.getElementById('nav-links');
    const allLinks   = navLinks ? navLinks.querySelectorAll('a') : [];

    if (!navbar) return;

    // Scroll → scrolled state
    const onScroll = () => {
        navbar.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Mobile toggle
    if (mobileBtn && navLinks) {
        mobileBtn.addEventListener('click', () => {
            const isOpen = navLinks.classList.toggle('open');
            mobileBtn.classList.toggle('open', isOpen);
            mobileBtn.setAttribute('aria-expanded', String(isOpen));
        });

        // Close on link click
        allLinks.forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('open');
                mobileBtn.classList.remove('open');
                mobileBtn.setAttribute('aria-expanded', 'false');
            });
        });
    }
}


/* ----------------------------------------------------------------
   3. SCROLL-REVEAL  (.fade-up elements)
   ---------------------------------------------------------------- */
function initScrollReveal() {
    const targets = document.querySelectorAll('.fade-up');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('in-view');
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    targets.forEach(el => observer.observe(el));
}


/* ----------------------------------------------------------------
   4. CHART BARS — animate on scroll-enter
   ---------------------------------------------------------------- */
function initChartBars() {
    const chart = document.getElementById('gap-chart');
    if (!chart) return;

    const bars = chart.querySelectorAll('.chart-bar');

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    bars.forEach(bar => {
                        const target = bar.dataset.width || '0';
                        bar.style.width = target + '%';
                    });
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.4 }
    );
    observer.observe(chart);
}


/* ----------------------------------------------------------------
   5. ARCHITECTURE DIAGRAM — sequential node lighting
   ---------------------------------------------------------------- */
function initArchDiagram() {
    const diagram = document.getElementById('arch-diagram');
    if (!diagram) return;

    const sequence = [
        ['arch-gpu0', 'arch-gpu1', 'arch-gpun'],   // top row GPUs
        ['cv1', 'cv2', 'cv3'],                      // top connectors
        ['arch-fabric'],                             // core
        ['cv4', 'cv5', 'cv6'],                      // bottom connectors
        ['arch-npu', 'arch-systemc', 'arch-proto'], // bottom modules
    ];

    let started = false;

    const trigger = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !started) {
                started = true;
                trigger.disconnect();
                runSequence(sequence, 320);
            }
        },
        { threshold: 0.35 }
    );
    trigger.observe(diagram);
}

function runSequence(sequence, delay) {
    sequence.forEach((group, groupIdx) => {
        setTimeout(() => {
            group.forEach(id => {
                const el = document.getElementById(id);
                if (el) el.classList.add('lit');
            });
        }, groupIdx * delay);
    });
}


/* ----------------------------------------------------------------
   6. SMOOTH ACTIVE NAV LINK — highlights section in viewport
   ---------------------------------------------------------------- */
function initActiveNav() {
    const sections = document.querySelectorAll('section[id]');
    const links    = document.querySelectorAll('.nav-link');
    if (!sections.length || !links.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    links.forEach(link => {
                        const href = link.getAttribute('href');
                        if (href && href === `#${entry.target.id}`) {
                            link.style.color = 'var(--text)';
                        } else {
                            link.style.color = '';
                        }
                    });
                }
            });
        },
        { rootMargin: `-${Math.round(window.innerHeight * 0.4)}px 0px -${Math.round(window.innerHeight * 0.4)}px 0px` }
    );

    sections.forEach(s => observer.observe(s));
}


/* ----------------------------------------------------------------
   7. CARD GLOW — mouse-tracking per card
   ---------------------------------------------------------------- */
function initCardGlow() {
    const cards = document.querySelectorAll('.tech-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', e => {
            const rect  = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width)  * 100;
            const y = ((e.clientY - rect.top)  / rect.height) * 100;
            const glow = card.querySelector('.card-glow');
            if (glow) {
                glow.style.background =
                    `radial-gradient(500px circle at ${x}% ${y}%, rgba(77,142,255,0.10), transparent 60%)`;
            }
        });
        card.addEventListener('mouseleave', () => {
            const glow = card.querySelector('.card-glow');
            if (glow) {
                glow.style.background =
                    'radial-gradient(500px circle at 50% -40%, rgba(77,142,255,0.07), transparent 60%)';
            }
        });
    });
}


/* ----------------------------------------------------------------
   8. METRIC COUNT-UP — runs when validation card enters view
   ---------------------------------------------------------------- */
function initCountUp() {
    const valCard = document.querySelector('.val-card');
    if (!valCard) return;

    let done = false;

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting && !done) {
                done = true;
                observer.disconnect();
                document.querySelectorAll('.metric-count[data-target]').forEach(el => {
                    animateCount(el);
                });
            }
        },
        { threshold: 0.4 }
    );
    observer.observe(valCard);
}

function animateCount(el) {
    const target  = parseInt(el.dataset.target, 10);
    const prefix  = el.dataset.prefix || '';
    const suffix  = el.dataset.suffix || '';
    const duration = 1400;
    const start    = performance.now();

    function update(now) {
        const elapsed  = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // ease-out cubic
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = Math.round(eased * target);

        el.textContent = `${prefix}${value}`;
        if (progress < 1) requestAnimationFrame(update);
        else el.textContent = `${prefix}${target}`;
    }
    requestAnimationFrame(update);
}


/* ----------------------------------------------------------------
   9. HERO PARALLAX — subtle depth on scroll
   ---------------------------------------------------------------- */
function initHeroParallax() {
    const heroContent = document.querySelector('.hero-content');
    const canvas      = document.getElementById('circuit-canvas');
    if (!heroContent || !canvas) return;

    window.addEventListener('scroll', () => {
        const y = window.scrollY;
        if (y < window.innerHeight) {
            heroContent.style.transform = `translateY(${y * 0.18}px)`;
            canvas.style.transform      = `translateY(${y * 0.08}px)`;
        }
    }, { passive: true });
}


/* ----------------------------------------------------------------
   10. SMOOTH CTA HOVER — button ripple
   ---------------------------------------------------------------- */
function initButtonRipple() {
    document.querySelectorAll('.btn-primary').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            const ripple = document.createElement('span');
            ripple.style.cssText = `
                position: absolute; border-radius: 50%;
                width: 4px; height: 4px;
                background: rgba(255,255,255,0.4);
                transform: translate(-50%,-50%) scale(0);
                left: ${x}px; top: ${y}px;
                animation: ripple 0.6s ease-out forwards;
                pointer-events: none;
            `;

            if (getComputedStyle(this).position === 'static') {
                this.style.position = 'relative';
            }
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    });

    // Inject ripple keyframes
    if (!document.getElementById('ripple-style')) {
        const style = document.createElement('style');
        style.id = 'ripple-style';
        style.textContent = `
            @keyframes ripple {
                to { transform: translate(-50%,-50%) scale(80); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }
}


/* ----------------------------------------------------------------
   11. IP ITEMS — stagger reveal
   ---------------------------------------------------------------- */
function initIPItems() {
    const items = document.querySelectorAll('.ip-item');
    if (!items.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                items.forEach((item, i) => {
                    setTimeout(() => {
                        item.style.opacity    = '1';
                        item.style.transform  = 'translateX(0)';
                    }, i * 100);
                });
                observer.disconnect();
            }
        },
        { threshold: 0.25 }
    );

    items.forEach(item => {
        item.style.opacity   = '0';
        item.style.transform = 'translateX(-16px)';
        item.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    const productSection = document.getElementById('product');
    if (productSection) observer.observe(productSection);
}


/* ----------------------------------------------------------------
   12. HIRING ROLES — stagger reveal
   ---------------------------------------------------------------- */
function initHiringRoles() {
    const roles = document.querySelectorAll('.role-item');
    if (!roles.length) return;

    const observer = new IntersectionObserver(
        (entries) => {
            if (entries[0].isIntersecting) {
                roles.forEach((role, i) => {
                    setTimeout(() => {
                        role.style.opacity    = '1';
                        role.style.transform  = 'translateY(0)';
                    }, i * 80);
                });
                observer.disconnect();
            }
        },
        { threshold: 0.4 }
    );

    roles.forEach(role => {
        role.style.opacity   = '0';
        role.style.transform = 'translateY(10px)';
        role.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    const contactSection = document.getElementById('contact');
    if (contactSection) observer.observe(contactSection);
}


/* ----------------------------------------------------------------
   INIT — run everything on DOM ready
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    new CircuitAnimation();
    initNav();
    initScrollReveal();
    initChartBars();
    initArchDiagram();
    initActiveNav();
    initCardGlow();
    initCountUp();
    initHeroParallax();
    initButtonRipple();
    initIPItems();
    initHiringRoles();
});
