/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
  	extend: {
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		},
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			card: {
  				DEFAULT: 'hsl(var(--card))',
  				foreground: 'hsl(var(--card-foreground))'
  			},
  			popover: {
  				DEFAULT: 'hsl(var(--popover))',
  				foreground: 'hsl(var(--popover-foreground))'
  			},
  			primary: {
  				DEFAULT: 'hsl(var(--primary))',
  				foreground: 'hsl(var(--primary-foreground))'
  			},
  			secondary: {
  				DEFAULT: 'hsl(var(--secondary))',
  				foreground: 'hsl(var(--secondary-foreground))'
  			},
  			muted: {
  				DEFAULT: 'hsl(var(--muted))',
  				foreground: 'hsl(var(--muted-foreground))'
  			},
  			accent: {
  				DEFAULT: 'hsl(var(--accent))',
  				foreground: 'hsl(var(--accent-foreground))'
  			},
  			destructive: {
  				DEFAULT: 'hsl(var(--destructive))',
  				foreground: 'hsl(var(--destructive-foreground))'
  			},
  			border: 'hsl(var(--border))',
  			input: 'hsl(var(--input))',
  			ring: 'hsl(var(--ring))',
  			chart: {
  				'1': 'hsl(var(--chart-1))',
  				'2': 'hsl(var(--chart-2))',
  				'3': 'hsl(var(--chart-3))',
  				'4': 'hsl(var(--chart-4))',
  				'5': 'hsl(var(--chart-5))'
  			},
  			sidebar: {
  				DEFAULT: 'hsl(var(--sidebar-background))',
  				foreground: 'hsl(var(--sidebar-foreground))',
  				primary: 'hsl(var(--sidebar-primary))',
  				'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
  				accent: 'hsl(var(--sidebar-accent))',
  				'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
  				border: 'hsl(var(--sidebar-border))',
  				ring: 'hsl(var(--sidebar-ring))'
  			},
  			emerald: {
  				50: 'hsl(var(--primary) / 0.08)',
  				100: 'hsl(var(--primary) / 0.12)',
  				200: 'hsl(var(--primary) / 0.2)',
  				300: 'hsl(var(--primary) / 0.3)',
  				400: 'hsl(var(--primary) / 0.4)',
  				500: 'hsl(var(--primary) / 0.6)',
  				600: 'hsl(var(--primary))',
  				700: 'hsl(var(--primary))',
  				800: 'hsl(var(--primary))',
  				900: 'hsl(var(--primary))',
  				950: 'hsl(var(--primary) / 0.95)'
  				},
  				/* ===== Layer 3 semantic tokens ===== */
  				'surface-page': 'rgb(var(--surface-page))',
  				'surface-card': 'rgb(var(--surface-card))',
  				'border-subtle': 'rgb(var(--border-subtle))',
  				'text-primary': 'rgb(var(--text-primary))',
  				'text-secondary': 'rgb(var(--text-secondary))',
  				'action': {
  				DEFAULT: 'rgb(var(--action-primary))',
  				'text': 'rgb(var(--action-primary-text))',
  				'hover': 'rgb(var(--action-primary-hover))'
  				},
  				'focus-ring': 'rgb(var(--focus-ring))',
  				'selected': {
  				DEFAULT: 'rgb(var(--selected-bg))',
  				'border': 'rgb(var(--selected-border))',
  				'text': 'rgb(var(--selected-text))'
  				},
  				/* ===== Layer 1 primitives ===== */
  				'neutral-0': 'rgb(var(--neutral-0))',
  				'neutral-50': 'rgb(var(--neutral-50))',
  				'neutral-100': 'rgb(var(--neutral-100))',
  				'neutral-200': 'rgb(var(--neutral-200))',
  				'neutral-400': 'rgb(var(--neutral-400))',
  				'neutral-600': 'rgb(var(--neutral-600))',
  				'neutral-800': 'rgb(var(--neutral-800))',
  				'neutral-900': 'rgb(var(--neutral-900))',
  				'status': {
  				'success': 'rgb(var(--success-500))',
  				'success-50': 'rgb(var(--success-50))',
  				'success-700': 'rgb(var(--success-700))',
  				'warning': 'rgb(var(--warning-500))',
  				'warning-50': 'rgb(var(--warning-50))',
  				'warning-700': 'rgb(var(--warning-700))',
  				'danger': 'rgb(var(--danger-500))',
  				'danger-50': 'rgb(var(--danger-50))',
  				'danger-700': 'rgb(var(--danger-700))',
  				'info': 'rgb(var(--info-500))',
  				'info-50': 'rgb(var(--info-50))',
  				'info-700': 'rgb(var(--info-700))'
  				},
  				'cat': {
  				'1': 'rgb(var(--cat-1))',
  				'2': 'rgb(var(--cat-2))',
  				'3': 'rgb(var(--cat-3))',
  				'4': 'rgb(var(--cat-4))',
  				'5': 'rgb(var(--cat-5))',
  				'6': 'rgb(var(--cat-6))'
  				}
  				},
  		keyframes: {
  			'accordion-down': {
  				from: {
  					height: '0'
  				},
  				to: {
  					height: 'var(--radix-accordion-content-height)'
  				}
  			},
  			'accordion-up': {
  				from: {
  					height: 'var(--radix-accordion-content-height)'
  				},
  				to: {
  					height: '0'
  				}
  			}
  		},
  		animation: {
  			'accordion-down': 'accordion-down 0.2s ease-out',
  			'accordion-up': 'accordion-up 0.2s ease-out'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
}