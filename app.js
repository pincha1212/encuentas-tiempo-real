
const API_URL = 'https://script.google.com/macros/library/d/1giwXcyhOFL82keURVJVIapvcDquSw-lRMEZntJS_u20euNo7Y7U3yQnl/1'; 

// Elementos del DOM
const form = document.getElementById('survey-form');
const btnSubmit = document.getElementById('btn-submit');
const spinner = document.getElementById('loading');
const successMsg = document.getElementById('success-message');
const totalResponsesEl = document.getElementById('total-responses');
const errorMsgEl = document.getElementById('error-message');
const resultsSection = document.getElementById('results-section');

// Almacenamiento de instancias de Chart.js para actualizarlas
let chartInstances = {
    p1: null,
    p2: null,
    p3: null
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // 1. Cargar resultados iniciales
    loadResults();
    
    // 2. Iniciar polling en tiempo real (cada 5 segundos = 5000ms)
    setInterval(loadResults, 5000);
});

// Manejo del envío del formulario
form.addEventListener('submit', async (e) => {
    e.preventDefault(); // Evita recargar la página

    // Capturar datos (la validación ya la hace HTML5 con el atributo 'required')
    const formData = new FormData(form);
    const data = {
        p1: formData.get('p1'),
        p2: formData.get('p2'),
        p3: formData.get('p3')
    };

    // UI de carga
    btnSubmit.disabled = true;
    spinner.style.display = 'block';

    try {
        // Nota: Enviamos como text/plain para evitar el OPTIONS preflight de CORS que Google Apps Script bloquea.
        const response = await fetch(API_URL, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'text/plain;charset=utf-8'
            }
        });

        const result = await response.json();

        if (result.status === 'success') {
            // Ocultar formulario, mostrar éxito
            form.style.display = 'none';
            successMsg.style.display = 'block';
            
            // Forzar actualización inmediata de gráficos
            await loadResults();

            // Scrollear a los resultados suavemente
            resultsSection.scrollIntoView({ behavior: 'smooth' });
        } else {
            throw new Error('Error en el backend');
        }

    } catch (error) {
        console.error('Error al enviar:', error);
        alert('Hubo un problema al enviar la encuesta. Intenta de nuevo.');
    } finally {
        btnSubmit.disabled = false;
        spinner.style.display = 'none';
    }
});

// Función para obtener datos y actualizar gráficos
async function loadResults() {
    if (API_URL === 'AQUÍ_PEGA_TU_URL_DE_APPS_SCRIPT') {
        errorMsgEl.innerText = "Configura la URL de tu API en app.js para ver los resultados.";
        return;
    }

    try {
        const response = await fetch(API_URL);
        const json = await response.json();

        if (json.status === 'success') {
            errorMsgEl.innerText = "";
            const data = json.data;
            totalResponsesEl.innerText = data.length;

            if (data.length > 0) {
                // Procesar datos para gráficos
                const stats = calculateStats(data);
                
                // Renderizar gráficos
                renderChart('chart-p1', 'Sistema Operativo', stats.p1, 'pie', 'p1');
                renderChart('chart-p2', 'Red Social', stats.p2, 'bar', 'p2');
                renderChart('chart-p3', 'Horas en Internet', stats.p3, 'doughnut', 'p3');
            }
        }
    } catch (error) {
        console.error('Error cargando resultados:', error);
        // Evitamos mostrar error si es fallo temporal de red para no asustar al usuario en el auto-refresh
    }
}

// Cuenta las ocurrencias de cada respuesta
function calculateStats(dataRows) {
    const counts = { p1: {}, p2: {}, p3: {} };
    
    dataRows.forEach(row => {
        // Incrementa el contador o lo inicializa en 1
        counts.p1[row.p1] = (counts.p1[row.p1] || 0) + 1;
        counts.p2[row.p2] = (counts.p2[row.p2] || 0) + 1;
        counts.p3[row.p3] = (counts.p3[row.p3] || 0) + 1;
    });

    return counts;
}

// Función genérica para dibujar o actualizar un gráfico
function renderChart(canvasId, title, dataObj, type, instanceKey) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    
    const labels = Object.keys(dataObj);
    const dataValues = Object.values(dataObj);

    // Paleta de colores atractiva
    const backgroundColors = [
        '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#64748b'
    ];

    const config = {
        type: type,
        data: {
            labels: labels,
            datasets: [{
                label: 'Votos',
                data: dataValues,
                backgroundColor: backgroundColors.slice(0, labels.length),
                borderWidth: 1,
                borderColor: '#ffffff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: title,
                    font: { family: 'Poppins', size: 16 }
                },
                legend: {
                    position: type === 'bar' ? 'none' : 'bottom' // Ocultar leyenda en barra
                }
            },
            animation: {
                duration: 500 // Animación rápida para evitar saltos en el refresh
            }
        }
    };

    // Si el gráfico ya existe, lo destruimos antes de re-dibujar para evitar solapamientos visuales
    if (chartInstances[instanceKey]) {
        chartInstances[instanceKey].destroy();
    }

    chartInstances[instanceKey] = new Chart(ctx, config);
}