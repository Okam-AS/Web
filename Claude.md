# Okam Admin Panel - Stilretningslinjer

Dette dokumentet beskriver design systemet og stilretningslinjene for admin-sidene i Okam Web-applikasjonen.

## Design System Oversikt

Admin-sidene følger et moderne, rent og profesjonelt design med fokus på brukervennlighet og visuell konsistens. 

---

## Fargepalett

### Primærfarger

| Farge | Hex | Bruk |
|-------|-----|------|
| **Primær grønn** | `#1bb776` | Hovedhandlinger, CTAs, aktive tilstander, priser |
| **Primær grønn (mørk)** | `#159f63` | Hover-tilstander for grønne elementer |
| **Mørk tekst** | `#292c34` | Overskrifter, viktig tekst |
| **Medium grå** | `#64748b` | Sekundær tekst, beskrivelser |
| **Lys grå** | `#94a3b8` | Placeholders, deaktivert tekst |

### Støttefarger

| Farge | Hex | Bruk |
|-------|-----|------|
| **Border grå** | `#e2e8f0` | Borders, delere |
| **Bakgrunn lys** | `#f8f9fa` | Kort bakgrunner, sekundære områder |
| **Bakgrunn side** | `#fafbfc` | Side bakgrunner |
| **Feil rød** | `#ef4444` | Slette-handlinger, feil |
| **Advarsel gul** | `#92400e` | Advarsler, obligatoriske badges |

---

## Typografi

### Hierarki

```scss
// Side titler
h1 {
  font-size: 2em;
  font-weight: 600;
  color: #292c34;

  @media (max-width: 768px) {
    font-size: 1.5em;
  }
}

// Seksjons titler
h2, h3 {
  font-size: 1.1em;
  font-weight: 600;
  color: #292c34;
}

// Form labels
label {
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}

// Brødtekst
p {
  font-size: 0.95em;
  color: #292c34;
}

// Hjelpetekst
.helper-text {
  font-size: 0.8em;
  color: #64748b;
  font-style: italic;
}
```

---

## Spacing System

Basert på 4px-inkrementer:

| Navn | Verdi | Bruk |
|------|-------|------|
| xs | 4px | Små gaps, interne avstander |
| sm | 8px | Labels, små marginer |
| md | 12px | Input padding, små gaps |
| base | 16px | Standard padding, gaps |
| lg | 20px | Kortinnhold padding |
| xl | 24px | Stor padding, seksjonsavstand |
| 2xl | 32px | Side margins, store gaps |
| 3xl | 48px | Seksjonsseparering |
| 4xl | 64px | Stor vertikal spacing |

### Sidepolstring
- **Desktop**: 24px
- **Mobile** (< 768px): 16px

---

## Border Radius

| Størrelse | Verdi | Bruk |
|-----------|-------|------|
| **Liten** | 6px | Tags, badges |
| **Medium** | 8px | Inputs, knapper |
| **Stor** | 12px | Kort, paneler |

---

## Skygger

```scss
// Lys skygge - kort, inputs
box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);

// Medium skygge - hevede elementer
box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);

// Tung skygge - modaler, popovers
box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);

// Grønn skygge - for grønne knapper
box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);

// Grønn hover skygge
box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);

// Rød skygge - for røde knapper
box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
```

---

## Overganger

```scss
// Standard
transition: all 0.3s ease;

// Rask (for quick feedback)
transition: all 0.2s ease;

// Panel-slides
transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
```

---

## Komponenter

### Kort (Cards)

```scss
.card {
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border: 1px solid #e8e8e8;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
  }
}
```

### Knapper

#### Primærknapp (Grønn)
```scss
.btn-primary {
  background: linear-gradient(135deg, #1bb776 0%, #159f63 100%);
  color: white;
  border: none;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.95em;
  box-shadow: 0 4px 12px rgba(27, 183, 118, 0.3);
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
  }

  &:disabled {
    background: #cbd5e0;
    box-shadow: none;
    cursor: not-allowed;
    opacity: 0.6;
  }
}
```

#### Sekundærknapp
```scss
.btn-secondary {
  background: white;
  color: #292c34;
  border: 2px solid #e2e8f0;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover {
    background: #f8f9fa;
    border-color: #cbd5e0;
    transform: translateY(-1px);
  }
}
```

#### Destruktiv knapp (Slett)
```scss
.btn-destructive {
  background: white;
  color: #ef4444;
  border: 2px solid #ef4444;
  padding: 14px 24px;
  border-radius: 8px;
  font-weight: 500;
  transition: all 0.3s ease;
  cursor: pointer;

  &:hover:not(:disabled) {
    background: #ef4444;
    color: white;
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
  }
}
```

### Form Inputs

```scss
.form-input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e2e8f0;
  border-radius: 8px;
  background: white;
  font-size: 0.95em;
  color: #292c34;
  transition: all 0.3s ease;

  &:hover {
    border-color: #cbd5e0;
  }

  &:focus {
    outline: none;
    border-color: #1bb776;
    box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.1);
    background: #ffffff;
  }

  &::placeholder {
    color: #94a3b8;
  }
}
```

### Form Labels

```scss
.form-label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.85em;
  font-weight: 600;
  color: #292c34;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
```

### Checkboxes

```scss
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    background: #f1f5f9;
  }

  input[type="checkbox"] {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    border: 2px solid #cbd5e0;

    &:checked {
      background-color: #1bb776;
      border-color: #1bb776;
    }

    &:focus {
      box-shadow: 0 0 0 3px rgba(27, 183, 118, 0.2);
    }
  }
}
```

### Responsive Grids

```scss
// Auto-fit responsive grid
.responsive-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 20px;
  margin-bottom: 32px;

  @media (max-width: 480px) {
    gap: 16px;
  }
}
```

---

## Side Struktur Template

```vue
<template>
  <AdminPage>
    <div class="[page-name]-page">
      <!-- Page Header -->
      <div class="page-header">
        <h1>Side Tittel</h1>
        <p>Valgfri beskrivelse av siden</p>
      </div>

      <!-- Controls/Filters Section (hvis nødvendig) -->
      <div class="controls-section">
        <div class="controls-row">
          <!-- Søk, filtre, handlinger -->
        </div>
      </div>

      <!-- Loading State -->
      <LoadingSkeleton v-if="isLoading" />

      <!-- Hovedinnhold -->
      <div v-else-if="hasContent" class="content-grid">
        <!-- Kort, lister, etc -->
      </div>

      <!-- Empty State -->
      <div v-else class="empty-state">
        <span class="material-icons">icon_name</span>
        <h3>Ingen elementer enda</h3>
        <p>Beskrivelse av hva brukeren kan gjøre</p>
        <button class="btn-primary" @click="createNew">
          <i class="fas fa-plus" /> Opprett første element
        </button>
      </div>
    </div>
  </AdminPage>
</template>

<script>
import AdminPage from "~/components/organisms/AdminPage.vue";
import LoadingSkeleton from "~/components/molecules/LoadingSkeleton.vue";

export default {
  components: {
    AdminPage,
    LoadingSkeleton
  },
  data: () => ({
    isLoading: false,
    // ... andre data
  })
}
</script>

<style lang="scss" scoped>
.{page-name}-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px;

  @media (max-width: 768px) {
    padding: 16px;
  }
}

.page-header {
  margin-bottom: 32px;

  h1 {
    font-size: 2em;
    font-weight: 600;
    color: #292c34;
    margin: 0 0 8px 0;
  }

  p {
    color: #64748b;
    margin: 0;
  }
}

.controls-section {
  background: #fff;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin-bottom: 32px;
}
</style>
```

---

## Empty States

```scss
.empty-state {
  text-align: center;
  padding: 64px 24px;
  background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
  border-radius: 12px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.05);
  margin: 32px 0;

  .material-icons {
    font-size: 4em;
    color: #cbd5e0;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 1.5em;
    color: #292c34;
    margin-bottom: 8px;
    font-weight: 600;
  }

  p {
    color: #64748b;
    margin-bottom: 24px;
  }
}
```

---

## Responsive Breakpoints

| Breakpoint | Verdi | Bruk |
|------------|-------|------|
| **Mobile** | `max-width: 768px` | Mobiltelefoner |
| **Small Mobile** | `max-width: 480px` | Små mobiltelefoner |
| **Tablet** | `min-width: 769px` og `max-width: 1024px` | Tablets |
| **Desktop** | `min-width: 1025px` | Desktop |

---

## Animasjonsretningslinjer

1. **Varighet**: 300ms for de fleste overganger, 200ms for rask tilbakemelding
2. **Easing**: `ease` for det meste, `cubic-bezier(0.4, 0, 0.2, 1)` for panel-slides
3. **Transforms**: Foretrekk transforms fremfor position/størrelse-endringer for ytelse
4. **Hover Effects**: Subtile (-2px til -4px translateY) med skyggeforsterkning

### Eksempler

```scss
// Kort hover
&:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.12);
}

// Knapp hover
&:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(27, 183, 118, 0.4);
}

// Lukkeknapp rotasjon
&:hover {
  transform: rotate(90deg);
}
```

---

## Tilgjengelighetr

1. **Focus States**: Alle interaktive elementer må ha synlige focus states med grønn tema
2. **Touch Targets**: Minimum 44x44px på mobil
3. **Fargekontrast**: Sikre tekst oppfyller WCAG AA-standarder
4. **Tastaturnavigasjon**: Alle handlinger tilgjengelig via tastatur
5. **Skjermlesere**: Bruk semantisk HTML og ARIA-etiketter der nødvendig

---

## Filplasseringer

- **Sider**: `/pages/admin/*.vue`
- **Komponenter**: `/components/admin/*.vue`, `/components/molecules/*.vue`, `/components/organisms/*.vue`
- **Stiler**: Scoped SCSS i komponentfiler
- **Felles stiler**: `/assets/sass/common.scss`

---

## Relaterte Filer

- **Referanse**: `/pages/admin/statistics.vue` - Kilde for design system
- **Produkter**: `/pages/admin/products.vue` - Implementerer dette systemet
- **Kategori Editor**: `/pages/admin/category-editor.vue` - Lignende mønstre

---

## Best Practices

### Loading States
- Bruk `LoadingSkeleton`-komponenten for innledende lastinger
- Vis inline-spinnere for knapp-handlinger
- Deaktiver knapper under prosessering med "Lagrer..."-tekst

### Error Handling
- Bruk toast-varsler for suksess/feil-meldinger
- Vis inline-valideringsfeil i skjemaer
- Gi gjenopprettingshandlinger der mulig

### Fargebruk
- **Grønn (#1bb776)**: Primære handlinger, suksess, priser
- **Rød (#ef4444)**: Destruktive handlinger, feil
- **Grå skala**: Nøytral informasjon, borders, bakgrunner

---

## Eksempel på Fullstendig Implementering

Se `/pages/admin/products.vue` for en fullstendig implementering av dette design systemet, inkludert:
- Side struktur med page-header og controls-section
- Loading og empty states
- Responsive produktkort grid
- Side panel editor med moderne styling
- Form inputs med grønn focus-tilstand
- Primære, sekundære og destruktive knapper
- Variant management med badges og hover-effekter

---

