(() => {
  const header = document.querySelector('.site-header');
  if (header) new ResizeObserver(() => {
    document.documentElement.style.setProperty('--header-height', `${header.getBoundingClientRect().height}px`);
  }).observe(header);
  const scene = document.querySelector('.park-scene');
  const g = window.gsap;
  if (!scene || !g) return;
  const status = document.querySelector('.park-announcement');
  const robot = scene.querySelector('.park-robot');
  const computer = scene.querySelector('.park-computer');
  const claw = scene.querySelector('.park-claw');
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  let robotBusy = false, booting = false, powered = false, selected = -1;
  const cards = [...document.querySelectorAll('.project-card')];
  const mm = g.matchMedia();
  mm.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
    const reduced = context.conditions.reduced;
    const duration = n => reduced ? 0 : n;
    const announce = message => { status.textContent = message; };
    const listeners = [];
    function on(el, type, fn) { if (!el) return; el.addEventListener(type, fn); listeners.push(() => el.removeEventListener(type, fn)); }
    function burst(el) {
      if (reduced) return;
      const box = el.getBoundingClientRect();
      for (let i = 0; i < 9; i++) {
        const spark = document.createElement('i'); spark.className = 'park-spark'; scene.append(spark);
        g.set(spark, { left: box.left + box.width / 2, top: box.top + box.height * .35 });
        g.fromTo(spark, { scale: 0, opacity: 1 }, { x: Math.cos(i * .8) * 100, y: -45 + Math.sin(i * .8) * 65, rotation: i * 40, scale: .6 + i % 3 * .3, opacity: 0, duration: 1, ease: 'power2.out', onComplete: () => spark.remove() });
      }
    }
    if (!reduced) {
      g.fromTo('.park-character', { y: 100, rotation: robot ? -12 : 5, opacity: 0 }, { y: 0, rotation: 0, opacity: 1, duration: 1.2, ease: 'back.out(1.4)', delay: .15 });
      g.from('.project-card', { y: 35, rotation: -2, opacity: .3, stagger: .12, duration: .8, ease: 'power3.out', clearProps: 'opacity' });
    }
    if (robot) {
      const head = robot.querySelector('.park-robot-head');
      const glow = robot.querySelector('.park-antenna-glow');
      const message = scene.querySelector('.park-message');
      const rows = [...document.querySelectorAll('.post-row')];
      const headX = g.quickTo(head, 'x', { duration: .6, ease: 'power3.out' });
      const headTurn = g.quickTo(head, 'rotation', { duration: .6, ease: 'power3.out' });
      g.set(head, { svgOrigin: '145 670' });
      if (!reduced) {
        g.to(glow, { opacity: .55, duration: 1.8, repeat: -1, yoyo: true, ease: 'sine.inOut' });
        g.to(head, { y: -3, duration: 2.6, repeat: -1, yoyo: true, ease: 'sine.inOut' });
      }
      on(document, 'pointermove', event => {
        if (reduced || !fine.matches || robotBusy) return;
        const box = robot.getBoundingClientRect();
        const dx = g.utils.clamp(-1, 1, (event.clientX - box.left - box.width / 2) / 450);
        headX(dx * 7); headTurn(dx * 5);
      });
      on(robot, 'click', () => {
        if (robotBusy) return;
        robotBusy = true;
        const row = rows.length ? rows[Math.floor(Math.random() * rows.length)] : null;
        const link = row?.querySelector('.post-title') || document.querySelector('.site-header a[href="/"]');
        message.hidden = false;
        const label = message.querySelector('.park-message-label');
        const output = message.querySelector('a');
        label.textContent = row ? '這次讀這篇？' : '回筆記區逛逛';
        output.textContent = row ? link.textContent : 'Notes →'; output.href = link.href;
        g.killTweensOf(head, 'x,rotation');
        const tl = g.timeline({ onComplete: () => { robotBusy = false; } });
        tl.to(head, { rotation: -12, x: -4, duration: duration(.22), ease: 'power2.in' })
          .to(robot, { y: -22, rotation: 4, duration: duration(.4), ease: 'back.out(2)' })
          .to(head, { rotation: 9, x: 8, duration: duration(.32), ease: 'back.out(2)' }, '<')
          .to(robot, { y: 0, rotation: 0, duration: duration(.65), ease: 'bounce.out' })
          .to(head, { rotation: 0, x: 0, duration: duration(.5), ease: 'power2.out' }, '<');
        g.fromTo(message, { y: 15, scale: .85, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: duration(.5), ease: 'back.out(1.8)' });
        if (row) {
          rows.forEach(item => item.classList.remove('park-picked-note'));
          row.classList.add('park-picked-note');
          row.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
          g.fromTo(row, { x: 12 }, { x: 0, duration: duration(.7), ease: 'elastic.out(1,.5)' });
        }
        burst(robot); announce(row ? `機器人推薦：${link.textContent}` : '回筆記區逛逛');
      });
    }
    function choose(index, scroll = false) {
      if (!cards.length) return;
      selected = index;
      cards.forEach((card, i) => card.classList.toggle('park-selected', i === index));
      scene.querySelector('.park-screen-label').textContent = `PROJECT ${String(index + 1).padStart(2, '0')}`;
      scene.querySelector('.park-screen-text').textContent = index === 0 ? 'PAPER' : 'SLIDES';
      if (scroll) cards[index].scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'center' });
      g.fromTo(cards[index], { y: 14 }, { y: 0, duration: duration(.55), ease: 'back.out(2)' });
      announce(`選擇作品：${cards[index].querySelector('h3').textContent}`);
    }
    if (computer) {
      const label = scene.querySelector('.park-screen-label');
      const text = scene.querySelector('.park-screen-text');
      const bar = scene.querySelector('.park-load-bar');
      const scan = scene.querySelector('.park-scanline');
      if (!reduced) g.fromTo(scan, { y: 0, opacity: .1 }, { y: 123, opacity: .4, duration: 2.8, repeat: -1, ease: 'none' });
      on(computer, 'click', () => {
        if (booting) return;
        if (powered) { choose((selected + 1) % cards.length, true); burst(computer); return; }
        booting = true; label.textContent = 'SYSTEM'; text.textContent = 'BOOTING';
        scene.classList.add('is-playing');
        const tl = g.timeline({ onComplete: () => {
          powered = true; booting = false;
          computer.setAttribute('aria-pressed', 'true');
          computer.setAttribute('aria-label', '切換下一個作品');
          scene.querySelector('.park-console-hint').textContent = '再點一下，切換作品 ↘';
          choose(0, true); burst(computer);
        } });
        tl.fromTo('.park-display', { scaleY: .02, opacity: 0, transformOrigin: '50% 50%' }, { scaleY: 1, opacity: 1, duration: duration(.45), ease: 'power3.out' })
          .to(computer, { rotation: -2, duration: duration(.08), repeat: reduced ? 0 : 3, yoyo: true })
          .to(bar, { attr: { width: 125 }, duration: duration(.85), ease: 'steps(8)' }, '<')
          .to(computer, { rotation: 0, duration: duration(.2) });
        if (!reduced) tl.fromTo(cards, { y: 25, scale: .96 }, { y: 0, scale: 1, duration: .5, stagger: .13, ease: 'back.out(1.7)' }, '-=.3');
      });
      cards.forEach((card, i) => {
        const cover = card.querySelector('.project-cover');
        const image = card.querySelector('.project-thumbnail');
        const rx = g.quickTo(cover, 'rotationX', { duration: .45, ease: 'power3.out' });
        const ry = g.quickTo(cover, 'rotationY', { duration: .45, ease: 'power3.out' });
        g.set(cover, { transformPerspective: 850 });
        on(card, 'pointerenter', () => {
          if (powered && !booting) choose(i);
          if (!reduced && fine.matches) g.to(cover, { y: -9, duration: .35, ease: 'power2.out' });
        });
        on(card, 'focusin', () => { if (powered && !booting) choose(i); });
        on(card, 'pointermove', event => {
          if (reduced || !fine.matches) return;
          const box = card.getBoundingClientRect();
          rx(-(event.clientY - box.top - box.height / 2) / box.height * 12);
          ry((event.clientX - box.left - box.width / 2) / box.width * 14);
          if (image) g.to(image, { x: (event.clientX - box.left - box.width / 2) * .015, duration: .4, overwrite: true });
        });
        on(card, 'pointerleave', () => {
          rx(0); ry(0); g.to(cover, { y: 0, duration: duration(.5), ease: 'power2.out' });
          if (image) g.to(image, { x: 0, duration: duration(.4) });
        });
      });
    }
    function grab() {
      const arm = scene.querySelector('.park-claw-grabber');
      g.killTweensOf(arm);
      g.timeline().to(arm, { x: -12, duration: duration(.2) }).to(arm, { y: 80, duration: duration(.4), ease: 'power2.in' }).to(arm, { x: 0, y: 0, duration: duration(.5), ease: 'back.out(1.4)' });
    }
    const tags = [...document.querySelectorAll('.tags-page .tag-link')];
    on(claw, 'click', () => { if (tags.length) tags[Math.floor(Math.random() * tags.length)].click(); else grab(); });
    tags.forEach(link => on(link, 'click', event => {
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1).replace(/\+/g, '%20')));
      if (!target) return;
      event.preventDefault(); tags.forEach(tag => tag.removeAttribute('aria-current')); link.setAttribute('aria-current', 'true');
      history.replaceState(null, '', `#${encodeURIComponent(target.id)}`);
      target.scrollIntoView({ behavior: reduced ? 'instant' : 'smooth', block: 'start' });
      grab(); announce(`夾到「${target.id}」`);
    }));
    scene.querySelectorAll('.park-character').forEach(el => on(el, 'keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); el.dispatchEvent(new MouseEvent('click')); }
    }));
    return () => {
      listeners.forEach(remove => remove()); scene.querySelectorAll('.park-spark').forEach(el => el.remove());
      robotBusy = false; booting = false;
    };
  });
})();
