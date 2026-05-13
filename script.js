// --- State Management ---
let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
let currentFilter = 'all'; 
let draggedItem = null; 
let editId = null; // Re-introduced for edit tracking

// --- DOM Elements ---
const form = document.getElementById('todo-form');
const input = document.getElementById('task-input');
const taskList = document.getElementById('task-list');
const taskCount = document.getElementById('task-count');
const filterContainer = document.getElementById('filter-container');
const clearCompletedBtn = document.getElementById('clear-completed');
const emptyState = document.getElementById('empty-state');
const progressCircle = document.getElementById('progress-circle');
const themeToggleBtn = document.getElementById('theme-toggle');

// --- Initialization ---
document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

const circumference = 16 * 2 * Math.PI;
progressCircle.style.strokeDasharray = `${circumference} ${circumference}`;

// Theme setup
const SVGs = {
    sun: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>`,
    moon: `<svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>`
};

const currentTheme = localStorage.getItem('theme') || 'light';
if (currentTheme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
themeToggleBtn.innerHTML = currentTheme === 'dark' ? SVGs.sun : SVGs.moon;

themeToggleBtn.addEventListener('click', () => {
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if (isDark) {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        themeToggleBtn.innerHTML = SVGs.moon;
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        themeToggleBtn.innerHTML = SVGs.sun;
    }
});

// --- Async Mock DB ---
const mockDatabaseSave = async (data) => {
    return new Promise(resolve => setTimeout(() => {
        localStorage.setItem('tasks', JSON.stringify(data));
        resolve();
    }, 150));
};

// --- Core Logic ---
const addTask = async (e) => {
    e.preventDefault(); 
    const taskText = input.value.trim();
    if (!taskText) return;

    tasks.unshift({ id: Date.now().toString(), text: taskText, completed: false });
    input.value = '';
    
    await mockDatabaseSave(tasks);
    renderTasks();
};

const handleListActions = async (e) => {
    const item = e.target.closest('.task-item');
    if (!item) return;
    const id = item.dataset.id;

    // Delete
    if (e.target.closest('.delete-btn')) {
        tasks = tasks.filter(task => task.id !== id);
        await mockDatabaseSave(tasks);
        renderTasks();
    }
    
    // Toggle Complete
    if (e.target.closest('.task-content')) {
        tasks = tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
        await mockDatabaseSave(tasks);
        renderTasks();
    }

    // Enter Edit Mode
    if (e.target.closest('.edit-btn')) {
        editId = id;
        renderTasks();
    }

    // Save Edit
    if (e.target.closest('.save-btn')) {
        const newText = item.querySelector('.edit-input').value.trim();
        if (newText) {
            tasks = tasks.map(t => t.id === id ? { ...t, text: newText } : t);
            editId = null;
            await mockDatabaseSave(tasks);
            renderTasks();
        }
    }
};

// Listen for "Enter" key on the edit input
taskList.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && e.target.classList.contains('edit-input')) {
        const item = e.target.closest('.task-item');
        item.querySelector('.save-btn').click();
    }
});

// --- Drag and Drop Logic ---
const handleDragStart = (e) => {
    if (editId) { e.preventDefault(); return; } // Disable drag while editing
    draggedItem = e.target.closest('.task-item');
    draggedItem.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
};

const handleDragOver = (e) => {
    e.preventDefault();
    if (editId) return;
    const currentHover = e.target.closest('.task-item');
    if (currentHover && currentHover !== draggedItem) {
        currentHover.classList.add('drag-over');
    }
};

const handleDragLeave = (e) => {
    const currentHover = e.target.closest('.task-item');
    if (currentHover) currentHover.classList.remove('drag-over');
};

const handleDrop = async (e) => {
    e.preventDefault();
    if (editId) return;
    const dropTarget = e.target.closest('.task-item');
    
    if (dropTarget && draggedItem && draggedItem !== dropTarget) {
        const draggedIndex = tasks.findIndex(t => t.id === draggedItem.dataset.id);
        const targetIndex = tasks.findIndex(t => t.id === dropTarget.dataset.id);

        const [removed] = tasks.splice(draggedIndex, 1);
        tasks.splice(targetIndex, 0, removed);
        
        await mockDatabaseSave(tasks);
        renderTasks();
    }
    
    if (draggedItem) draggedItem.classList.remove('dragging');
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
};

const handleDragEnd = () => {
    if (draggedItem) draggedItem.classList.remove('dragging');
    draggedItem = null;
};

// --- Update UI Stats ---
const updateStats = () => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    taskCount.textContent = `${total - completed} remaining`;

    const percent = total === 0 ? 0 : (completed / total) * 100;
    progressCircle.style.strokeDashoffset = circumference - (percent / 100) * circumference;
};

// --- Render Logic ---
const renderTasks = () => {
    taskList.innerHTML = '';
    
    let filteredTasks = tasks;
    if (currentFilter === 'active') filteredTasks = tasks.filter(t => !t.completed);
    if (currentFilter === 'completed') filteredTasks = tasks.filter(t => t.completed);

    if (filteredTasks.length === 0) emptyState.classList.remove('hidden');
    else emptyState.classList.add('hidden');

    filteredTasks.forEach(task => {
        const li = document.createElement('li');
        li.className = `task-item ${task.completed ? 'completed' : ''}`;
        li.dataset.id = task.id;
        
        // Disable dragging if this specific task is being edited
        li.draggable = task.id !== editId; 

        if (task.id === editId) {
            li.innerHTML = `
                <div class="edit-wrapper">
                    <input type="text" class="edit-input" value="${task.text}">
                    <button class="save-btn">Save</button>
                </div>
            `;
            // Auto-focus the input
            setTimeout(() => {
                const inputEl = li.querySelector('.edit-input');
                inputEl.focus();
                inputEl.selectionStart = inputEl.selectionEnd = inputEl.value.length;
            }, 0);
        } else {
            li.innerHTML = `
                <div class="drag-handle" title="Drag to reorder">
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24"><path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM20 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/></svg>
                </div>
                <div class="task-content">
                    <div class="custom-checkbox">
                        ${task.completed ? '<svg width="10" height="10" stroke="white" stroke-width="3" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"></path></svg>' : ''}
                    </div>
                    <span class="task-text">${task.text}</span>
                </div>
                <div class="task-actions">
                    <button class="action-btn edit-btn" aria-label="Edit">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button class="action-btn delete-btn" aria-label="Delete">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                </div>
            `;
        }
        
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('dragleave', handleDragLeave);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragend', handleDragEnd);

        taskList.appendChild(li);
    });

    updateStats();
};

// --- Listeners ---
form.addEventListener('submit', addTask);
taskList.addEventListener('click', handleListActions);
clearCompletedBtn.addEventListener('click', async () => {
    tasks = tasks.filter(t => !t.completed);
    await mockDatabaseSave(tasks);
    renderTasks();
});

filterContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('filter-btn')) {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentFilter = e.target.dataset.filter;
        renderTasks();
    }
});

renderTasks();