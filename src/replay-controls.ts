import { type EulerOrder, type Quaternion } from 'three';
import { exampleSeries, parseSeries, sampleOrientation, type AttitudeSample } from './replay.ts';

export function createReplay(apply: (rotation: Quaternion) => void, fit: () => void, render: () => void) {
  const csv = document.querySelector<HTMLTextAreaElement>('#replay-csv')!;
  const file = document.querySelector<HTMLInputElement>('#replay-file')!;
  const units = document.querySelector<HTMLSelectElement>('#replay-units')!;
  const order = document.querySelector<HTMLSelectElement>('#replay-order')!;
  const message = document.querySelector<HTMLElement>('#replay-message')!;
  const play = document.querySelector<HTMLButtonElement>('#play-replay')!;
  const restart = document.querySelector<HTMLButtonElement>('#restart-replay')!;
  const seek = document.querySelector<HTMLInputElement>('#replay-time')!;
  const clock = document.querySelector<HTMLOutputElement>('#replay-time-value')!;
  let samples: AttitudeSample[] = [];
  let time = 0;
  let playing = false;
  let previousTime: number | null = null;
  const duration = () => samples.at(-1)?.time ?? 0;
  function pause() {
    playing = false;
    previousTime = null;
    play.textContent = 'Play';
  }
  function show() {
    apply(sampleOrientation(samples, time));
    seek.value = String(time);
    clock.value = `${time.toFixed(2)} / ${duration().toFixed(2)} s`;
    render();
  }
  function load() {
    pause();
    try {
      const parsed = parseSeries(csv.value, order.value as EulerOrder, units.value === 'radians');
      samples = parsed;
      time = 0;
      play.disabled = restart.disabled = seek.disabled = false;
      seek.max = String(duration());
      message.textContent = `${samples.length} samples loaded · ${units.value}, ${order.value} · ${duration().toFixed(2)} s`;
      message.classList.remove('invalid');
      show();
      fit();
    } catch (cause) {
      message.textContent = `${cause instanceof Error ? cause.message : 'Invalid CSV.'} ${samples.length ? 'Previous series retained.' : ''}`;
      message.classList.add('invalid');
    }
  }
  document.querySelector('#load-replay')!.addEventListener('click', load);
  document.querySelector('#example-replay')!.addEventListener('click', () => {
    csv.value = exampleSeries;
    units.value = 'degrees';
    order.value = 'XYZ';
    load();
  });
  file.addEventListener('change', async () => {
    pause();
    const selected = file.files?.[0];
    if (!selected) return;
    try {
      if (selected.size > 5_000_000) throw new Error('Use a CSV smaller than 5 MB.');
      csv.value = await selected.text();
      message.textContent = 'File ready';
      message.classList.remove('invalid');
    } catch (cause) {
      message.textContent = cause instanceof Error ? cause.message : 'Could not read file.';
      message.classList.add('invalid');
    }
  });
  for (const input of [csv, units, order]) input.addEventListener('input', () => {
    pause();
    message.textContent = 'Unapplied changes';
  });
  play.addEventListener('click', () => {
    if (playing) { pause(); return; }
    if (!samples.length) return;
    if (time >= duration()) time = 0;
    playing = true;
    previousTime = null;
    play.textContent = 'Pause';
    show();
    fit();
  });
  restart.addEventListener('click', () => {
    pause(); time = 0; show(); fit();
  });
  seek.addEventListener('input', () => {
    pause(); time = Number(seek.value); show(); fit();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  return {
    pause,
    get playing() { return playing; },
    get loaded() { return samples.length > 0; },
    reset() { pause(); time = 0; seek.value = '0'; clock.value = `0.00 / ${duration().toFixed(2)} s`; },
    tick(now: number) {
      if (!playing) return;
      if (previousTime !== null) time = Math.min(duration(), time + (now - previousTime) / 1000);
      previousTime = now;
      show();
      if (time >= duration()) pause();
    },
  };
}
