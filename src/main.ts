import './app/theme.ts';
import './styles/shell.css';
import { startShell } from './app/shell.ts';

startShell(document.querySelector<HTMLElement>('#view-switch')!);
