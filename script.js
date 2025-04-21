let attractionsData = [];
let currentFilters = {
    state: 'All',
    city: 'All',
    category: 'All'
};
let currentlyExpandedCard = null;

const modal = document.createElement('div');
modal.className = 'modal';
modal.innerHTML = `
    <div class="modal-content">
        <div class="modal-header">
            <h2 class="modal-title"></h2>
            <span class="close-modal">&times;</span>
        </div>
        <div class="modal-body">
            <img class="modal-image" src="" alt="">
        </div>
        <div class="modal-footer">
            <div class="modal-thumbnails"></div>
        </div>
    </div>
`;

document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild(modal);

    document.querySelector('.close-modal').addEventListener('click', () => {
        modal.style.display = 'none';
    });


    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
});

window.onload = function () {
    fetch('attractions.xml')
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.text();
        })
        .then(data => {
            const parser = new DOMParser();
            const xml = parser.parseFromString(data, "application/xml");

            const parserError = xml.querySelector('parsererror');
            if (parserError) {
                throw new Error('Error parsing XML: ' + parserError.textContent);
            }

            const attractions = Array.from(xml.getElementsByTagName("Attraction"));
            if (!attractions.length) {
                throw new Error('No attractions found in XML');
            }

            attractionsData = attractions.map(attraction => {
                try {
                    const state = attraction.getElementsByTagName("State")[0]?.textContent || 'Unknown';
                    const normalizedState = state === 'Federal Territory of Kuala Lumpur' ? 'Kuala Lumpur' : 
                                         state === 'Selangor' ? 'Kuala Lumpur' : state;

                    const city = attraction.getElementsByTagName("City")[0]?.textContent || 'Unknown';
                    const normalizedCity = city;

                    const images = Array.from(attraction.getElementsByTagName("Image")).map(img => {
                        let path = img.textContent;
                        if (!path.startsWith('images/')) {
                            path = 'images/' + path;
                        }
                        path = path.replace(/\\/g, '/').trim();
                        return path;
                    }).filter(Boolean);

                    const handleImageError = (img) => {
                        console.warn(`Failed to load image: ${img.src}`);
                        img.src = 'images/no-image.jpg';
                        img.alt = 'Image not available';
                        return false;
                    };

                    return {
                        name: attraction.getElementsByTagName("Name")[0]?.textContent || 'Unknown',
                        placeID: attraction.getElementsByTagName("PlaceID")[0]?.textContent || 'N/A',
                        city: normalizedCity,
                        state: normalizedState,
                        description: attraction.getElementsByTagName("Description")[0]?.textContent || 'No description available',
                        openingHours: attraction.getElementsByTagName("OpeningHours")[0]?.textContent || 'Not specified',
                        price: attraction.getElementsByTagName("Price")[0]?.textContent || 'Not specified',
                        category: attraction.getElementsByTagName("Category")[0]?.textContent || 'Unknown',
                        images: images,
                        handleImageError: handleImageError
                    };
                } catch (error) {
                    console.error('Error processing attraction:', error);
                    return null;
                }
            }).filter(Boolean);


            const cityFilter = document.getElementById('cityFilter');
            if (!cityFilter) {
                console.error('City filter element not found');
                return;
            }

            cityFilter.innerHTML = '<option value="All">All Cities</option>';


            const citiesByState = {};
            attractionsData.forEach(attraction => {
                if (!citiesByState[attraction.state]) {
                    citiesByState[attraction.state] = new Set();
                }
                citiesByState[attraction.state].add(attraction.city);
            });


            const stateOrder = ['Sabah', 'Sarawak', 'Johor', 'Kuala Lumpur', 'Kedah', 'Melaka'];


            stateOrder.forEach(state => {
                if (citiesByState[state]?.size > 0) {

                    const stateOption = document.createElement('option');
                    stateOption.value = state;
                    stateOption.textContent = state;
                    stateOption.disabled = true;
                    stateOption.style.fontWeight = 'bold';
                    cityFilter.appendChild(stateOption);

   
                    Array.from(citiesByState[state])
                        .sort()
                        .forEach(city => {
                            const cityOption = document.createElement('option');
                            cityOption.value = city;
                            cityOption.textContent = city;
                            cityFilter.appendChild(cityOption);
                        });
                } else if (state === 'Kedah') {
   
                    const stateOption = document.createElement('option');
                    stateOption.value = state;
                    stateOption.textContent = state;
                    stateOption.disabled = true;
                    stateOption.style.fontWeight = 'bold';
                    cityFilter.appendChild(stateOption);


                    const langkawiOption = document.createElement('option');
                    langkawiOption.value = 'Langkawi';
                    langkawiOption.textContent = 'Langkawi';
                    cityFilter.appendChild(langkawiOption);
                }
            });

            console.log('City dropdown populated successfully');

            displayAttractions();
        })
        .catch(error => {
            console.error('Error loading attractions:', error);
            document.getElementById("attractionContainer").innerHTML = 
                `<p class='error'>Error loading attractions: ${error.message}</p>`;
        });
};

function filterAttractions(value, type) {
    if (type === 'state') {
        currentFilters.state = value;
        const cityFilter = document.getElementById('cityFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        
        if (!cityFilter || !categoryFilter) {
            console.error('Required filter elements not found');
            return;
        }

        cityFilter.innerHTML = '<option value="All">All Cities</option>';
        categoryFilter.innerHTML = '<option value="All">All Categories</option>';
        
        if (value !== 'All') {
            const cities = new Set();
            attractionsData.forEach(attraction => {
                if (attraction.state === value || (value === 'Kedah' && attraction.city === 'Langkawi')) {
                    cities.add(attraction.city);
                }
            });
            
            Array.from(cities).sort().forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            });
            
            if (cities.size > 0) {
                cityFilter.value = Array.from(cities)[0];
                currentFilters.city = Array.from(cities)[0];
                updateCategoryDropdown(value, currentFilters.city);
            } else {
                currentFilters.city = 'All';
                currentFilters.category = 'All';
            }
        } else {
            // When "All States" is selected, show all cities and categories
            const allCities = new Set();
            const allCategories = new Set();
            
            attractionsData.forEach(attraction => {
                allCities.add(attraction.city);
                allCategories.add(attraction.category);
            });
            
            // Add all cities to the dropdown
            Array.from(allCities).sort().forEach(city => {
                const option = document.createElement('option');
                option.value = city;
                option.textContent = city;
                cityFilter.appendChild(option);
            });
            
            // Add all categories to the dropdown
            Array.from(allCategories).sort().forEach(category => {
                const option = document.createElement('option');
                option.value = category;
                option.textContent = category;
                categoryFilter.appendChild(option);
            });
            
            currentFilters.city = 'All';
            currentFilters.category = 'All';
        }
    } else if (type === 'city') {
        currentFilters.city = value;
        updateCategoryDropdown(currentFilters.state, value);
    } else if (type === 'category') {
        currentFilters.category = value;
    }
    displayAttractions();
}

function updateCategoryDropdown(state, city) {
    const categoryFilter = document.getElementById('categoryFilter');
    if (!categoryFilter) {
        console.error('Category filter element not found');
        return;
    }

    categoryFilter.innerHTML = '<option value="All">All Categories</option>';
    
    const categories = new Set();
    attractionsData.forEach(attraction => {
        const stateMatch = state === 'All' || attraction.state === state;
        const cityMatch = city === 'All' || attraction.city === city;
        
        if (stateMatch && cityMatch) {
            categories.add(attraction.category);
        }
    });
    
    if (categories.size > 0) {
        Array.from(categories).sort().forEach(category => {
            const option = document.createElement('option');
            option.value = category;
            option.textContent = category;
            categoryFilter.appendChild(option);
        });
        
        categoryFilter.value = Array.from(categories)[0];
        currentFilters.category = Array.from(categories)[0];
    } else {
        currentFilters.category = 'All';
    }
}

function displayAttractions() {
    const container = document.getElementById("attractionContainer");
    container.innerHTML = "";

    const filteredAttractions = attractionsData.filter(attraction => {
        const stateMatch = currentFilters.state === 'All' || 
                          attraction.state === currentFilters.state;
        
        const cityMatch = currentFilters.city === 'All' || 
                         attraction.city === currentFilters.city;
        
        const categoryMatch = currentFilters.category === 'All' || 
                            attraction.category === currentFilters.category;
        
        return stateMatch && cityMatch && categoryMatch;
    });

    const regions = [
        {
            name: 'East Malaysia',
            states: ['Sabah', 'Sarawak']
        },
        {
            name: 'West Malaysia',
            states: ['Johor', 'Kuala Lumpur', 'Kedah', 'Melaka']
        }
    ];

    const attractionsByState = filteredAttractions.reduce((acc, attraction) => {
        if (!acc[attraction.state]) {
            acc[attraction.state] = [];
        }
        acc[attraction.state].push(attraction);
        return acc;
    }, {});

    regions.forEach(region => {
    
        const regionStates = region.states.filter(state => attractionsByState[state]?.length > 0);

        if (regionStates.length > 0) {

            const regionSection = document.createElement("div");
            regionSection.className = "region-section";

            const regionHeader = document.createElement("h2");
            regionHeader.className = "region-header";
            regionHeader.textContent = region.name;
            regionSection.appendChild(regionHeader);

            const statesContainer = document.createElement("div");
            statesContainer.className = "states-container";

            regionStates.forEach(state => {
                const stateSection = document.createElement("div");
                stateSection.className = "state-section";

                const stateHeader = document.createElement("h3");
                stateHeader.className = "state-header";
                stateHeader.textContent = state;
                stateSection.appendChild(stateHeader);

                const stateContainer = document.createElement("div");
                stateContainer.className = "state-attractions";

                attractionsByState[state].forEach(attraction => {
                    const div = document.createElement("div");
                    div.classList.add("attraction");
                    div.setAttribute("data-city", attraction.city);
                    div.setAttribute("data-state", attraction.state);
                    div.setAttribute("data-category", attraction.category);

                    const card = document.createElement("div");
                    card.className = "attraction-card";

                    const imageContainer = document.createElement("div");
                    imageContainer.className = "image-container";
 
                    const img = document.createElement("img");
                    img.src = attraction.images[0];
                    img.alt = attraction.name;
                    img.onerror = () => attraction.handleImageError(img);

                    imageContainer.appendChild(img);
                    card.appendChild(imageContainer);

                    const infoContainer = document.createElement("div");
                    infoContainer.className = "info-container";
 
                    const name = document.createElement("h3");
                    name.textContent = attraction.name;
                    infoContainer.appendChild(name);

                    const category = document.createElement("p");
                    category.className = "category";
                    category.textContent = attraction.category;
                    infoContainer.appendChild(category);

                    const details = document.createElement("div");
                    details.className = "details";
                    details.style.maxHeight = "0";
                    details.style.overflow = "hidden";
                    details.style.transition = "max-height 0.3s ease-out";

                    const city = document.createElement("p");
                    city.innerHTML = `<strong>City:</strong> ${attraction.city}`;
                    details.appendChild(city);

                    const state = document.createElement("p");
                    state.innerHTML = `<strong>State:</strong> ${attraction.state}`;
                    details.appendChild(state);

                    const description = document.createElement("p");
                    description.textContent = attraction.description;
                    details.appendChild(description);

                    const openingHours = document.createElement("p");
                    openingHours.innerHTML = `<strong>Opening Hours:</strong> ${attraction.openingHours}`;
                    details.appendChild(openingHours);

                    const price = document.createElement("p");
                    price.innerHTML = `<strong>Price:</strong> ${attraction.price}`;
                    details.appendChild(price);

                    infoContainer.appendChild(details);
                    card.appendChild(infoContainer);

                    card.addEventListener('click', () => {
                        const isExpanded = details.style.maxHeight !== "0px";
                        
                        if (currentlyExpandedCard && currentlyExpandedCard !== details) {
                            currentlyExpandedCard.style.maxHeight = "0";
                        }
                        
                        currentlyExpandedCard = isExpanded ? null : details;
                        
                        details.style.maxHeight = isExpanded ? "0" : "500px";
                    });

                    div.appendChild(card);
                    stateContainer.appendChild(div);
                });

                stateSection.appendChild(stateContainer);
                statesContainer.appendChild(stateSection);
            });

            regionSection.appendChild(statesContainer);
            container.appendChild(regionSection);
        }
    });
}


const stateNormalizationMap = {
    'Federal Territory of Kuala Lumpur': 'Kuala Lumpur',
    'Selangor': 'Kuala Lumpur',
    'Kedah': 'Langkawi'
};


function handleImageError(imgElement, fallbackPath = 'images/no-image.jpg') {
    console.warn(`Failed to load image: ${imgElement.src}`);
    imgElement.src = fallbackPath;
    imgElement.alt = 'Image not available';
    return false;
}


function processAttraction(attraction) {
    const card = document.createElement("div");
    card.className = "attraction-card";

    const imageContainer = document.createElement("div");
    imageContainer.className = "image-container";

    const img = document.createElement("img");
    img.src = attraction.images[0];
    img.alt = attraction.name;
    img.onerror = () => attraction.handleImageError(img);

    imageContainer.appendChild(img);
    card.appendChild(imageContainer);

    const infoContainer = document.createElement("div");
    infoContainer.className = "info-container";
 
    const name = document.createElement("h3");
    name.textContent = attraction.name;
    infoContainer.appendChild(name);

    const category = document.createElement("p");
    category.className = "category";
    category.textContent = attraction.category;
    infoContainer.appendChild(category);

    const details = document.createElement("div");
    details.className = "details";
    details.style.maxHeight = "0";
    details.style.overflow = "hidden";
    details.style.transition = "max-height 0.3s ease-out";

    const city = document.createElement("p");
    city.textContent = `City: ${attraction.city}`;
    details.appendChild(city);

    const description = document.createElement("p");
    description.textContent = attraction.description;
    details.appendChild(description);

    const openingHours = document.createElement("p");
    openingHours.innerHTML = `Opening Hours: ${attraction.openingHours.replace(/\|/g, '<br>')}`;
    details.appendChild(openingHours);

    const price = document.createElement("p");
    price.textContent = `Price: ${attraction.price}`;
    details.appendChild(price);

    infoContainer.appendChild(details);
    card.appendChild(infoContainer);

    card.addEventListener('click', () => {
        const isExpanded = details.style.maxHeight !== "0px";
        
        if (currentlyExpandedCard && currentlyExpandedCard !== details) {
            currentlyExpandedCard.style.maxHeight = "0";
        }
        
        currentlyExpandedCard = isExpanded ? null : details;
        
        details.style.maxHeight = isExpanded ? "0" : "500px";
    });

    return card;
}

function showModal(attraction) {
    const modal = document.querySelector('.modal');
    const modalTitle = modal.querySelector('.modal-title');
    const modalImage = modal.querySelector('.modal-image');
    const modalThumbnails = modal.querySelector('.modal-thumbnails');
    
    modalTitle.textContent = attraction.name;
    modalImage.src = attraction.images[0];
    modalImage.alt = attraction.name;
    modalImage.onerror = () => attraction.handleImageError(modalImage);

    modalThumbnails.innerHTML = '';
    
    const thumbnail = document.createElement('img');
    thumbnail.src = attraction.images[0];
    thumbnail.alt = attraction.name;
    thumbnail.className = 'modal-thumbnail';
    thumbnail.onerror = () => attraction.handleImageError(thumbnail);
    thumbnail.addEventListener('click', () => {
        modalImage.src = attraction.images[0];
    });
    modalThumbnails.appendChild(thumbnail);


    const modalBody = modal.querySelector('.modal-body');
    const existingInfo = modalBody.querySelector('.attraction-info');
    if (existingInfo) {
        existingInfo.remove();
    }

    const infoContainer = document.createElement('div');
    infoContainer.className = 'attraction-info';
    
    const description = document.createElement('p');
    description.className = 'modal-description';
    description.textContent = attraction.description;
    infoContainer.appendChild(description);

    const openingHours = document.createElement('p');
    openingHours.className = 'modal-opening-hours';
    openingHours.innerHTML = `Opening Hours: ${attraction.openingHours.replace(/\|/g, '<br>')}`;
    infoContainer.appendChild(openingHours);

    const price = document.createElement('p');
    price.className = 'modal-price';
    price.textContent = `Price: ${attraction.price}`;
    infoContainer.appendChild(price);

    modalBody.appendChild(infoContainer);

    modal.style.display = 'block';
}

function resetFilters() {
    // Reset all filters to 'All'
    currentFilters = {
        state: 'All',
        city: 'All',
        category: 'All'
    };

    // Reset dropdown values
    document.getElementById('stateFilter').value = 'All';
    document.getElementById('cityFilter').value = 'All';
    document.getElementById('categoryFilter').value = 'All';

    // Re-enable state filter if it was disabled
    document.getElementById('stateFilter').disabled = false;

    // Reset category filter to show all options
    const categoryFilter = document.getElementById('categoryFilter');
    categoryFilter.innerHTML = `
        <option value="All">All Categories</option>
        <option value="Recreational">Recreational</option>
        <option value="Entertainment">Entertainment</option>
        <option value="Nature">Nature</option>
        <option value="Educational">Educational</option>
        <option value="Cultural">Cultural</option>
        <option value="Adventure">Adventure</option>
        <option value="Historical">Historical</option>
    `;


    displayAttractions();
}
