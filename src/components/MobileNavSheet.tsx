import { Menu } from 'lucide-react';
import { Button } from './ui/button';
import {
	Sheet,
	SheetClose,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
	SheetTrigger,
} from './ui/sheet';
import { cn } from '../lib/utils';

type NavItem = {
	href: string;
	label: string;
	badgeCount?: number;
};

type MobileNavSheetProps = {
	currentPath: string;
	navItems: NavItem[];
	actions?: NavItem[];
	currentUserEmail?: string | null;
	currentUserLabel?: string;
};

function isActive(currentPath: string, path: string) {
	return currentPath === path || (path !== '/' && currentPath.startsWith(path));
}

export default function MobileNavSheet({
	currentPath,
	navItems,
	actions = [],
	currentUserEmail,
	currentUserLabel,
}: MobileNavSheetProps) {
	const handleLogout = async () => {
		await fetch('/api/auth/logout', { method: 'POST' });
		window.location.href = '/auth?fresh=1';
	};

	return (
		<div className="app-mobile-bar">
			<a className="app-mobile-brand" href="/">
				<img
					alt="See It Say It logo mark"
					className="brand-icon"
					height="40"
					loading="eager"
					src="/brand/logo-mark-only-light.svg"
					width="157"
				/>
				<img
					alt="See It Say It wordmark"
					className="brand-wordmark"
					height="28"
					loading="eager"
					src="/brand/logo-text-only-light.svg"
					width="152"
				/>
			</a>

			<Sheet>
				<SheetTrigger asChild>
					<Button aria-label="Open navigation" size="icon" type="button" variant="secondary">
						<Menu size={18} />
					</Button>
				</SheetTrigger>
				<SheetContent
					className="w-[min(88vw,22rem)] border-[hsl(var(--border))] bg-[hsl(var(--background))] px-5 py-6"
					side="left"
				>
					<SheetHeader className="pr-10">
						<SheetTitle>Navigation</SheetTitle>
						<SheetDescription>
							{currentUserEmail
								? `Signed in as ${currentUserLabel ?? currentUserEmail}.`
								: 'Move between reporting, tracking, authority work, and project updates.'}
						</SheetDescription>
					</SheetHeader>

					<nav className="mt-6 grid gap-2">
						{navItems.map((item) => (
							<SheetClose asChild key={item.href}>
								<a
									className={cn(
										'flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-sm font-medium transition-colors',
										isActive(currentPath, item.href)
											? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--foreground))]'
											: 'border-[hsl(var(--border))] bg-[hsl(var(--secondary))] text-[hsl(var(--muted-foreground))]',
									)}
									href={item.href}
								>
									<span>{item.label}</span>
									{item.badgeCount ? <span className="nav-badge">{item.badgeCount}</span> : null}
								</a>
							</SheetClose>
						))}
					</nav>

					<div className="mt-6 grid gap-2">
						{currentUserEmail ? (
							<Button onClick={handleLogout} type="button" variant="outline">
								Sign out
							</Button>
						) : (
							<SheetClose asChild>
								<a
									className="flex min-h-11 items-center rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]"
									href="/auth?fresh=1"
								>
									Sign in
								</a>
							</SheetClose>
						)}
						{actions.map((action) => (
							<SheetClose asChild key={action.href}>
								<a
									className="flex min-h-11 items-center rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]"
									href={action.href}
								>
									{action.label}
								</a>
							</SheetClose>
						))}
						<SheetClose asChild>
							<a
								className="flex min-h-11 items-center rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]"
								href="/onboarding?mode=settings"
							>
								Preferences
							</a>
						</SheetClose>
						<SheetClose asChild>
							<a
								className="flex min-h-11 items-center rounded-xl border border-[hsl(var(--border))] px-4 py-3 text-sm font-medium text-[hsl(var(--muted-foreground))]"
								href="/inside/roadmap"
							>
								Roadmap
							</a>
						</SheetClose>
					</div>
				</SheetContent>
			</Sheet>
		</div>
	);
}
