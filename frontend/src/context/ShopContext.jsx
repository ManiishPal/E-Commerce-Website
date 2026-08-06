import { createContext, useCallback, useEffect, useRef, useState } from "react";
// import { products } from "../assets/assets";
import { toast } from "react-toastify";
import { useNavigate } from "react-router-dom";
import axios from 'axios';


export const ShopContext = createContext();

const ShopContextProvider = (props) => {

    const currency = '₹';
    const deliver_fee = 50;
    const backendUrl =import.meta.env.VITE_BACKEND_URL || 'http://localhost:4000';
    const [search, setSearch] = useState('');
    const [showSearch, setShowSearch] = useState(false);
    const [cartItems, setCartItems] = useState({});
    const [products, setProducts] = useState([]);
    const [token, setToken] = useState('');
    const navigate = useNavigate();
    const recentInteractionKeys = useRef(new Map());
    const [recommendationSessionId] = useState(() => {
        const storageKey = 'recommendationSessionId';
        const existingId = localStorage.getItem(storageKey);
        if (existingId) return existingId;
        const newId = crypto.randomUUID();
        localStorage.setItem(storageKey, newId);
        return newId;
    });
    const getInteractionHeaders = useCallback(() => ({
        'x-session-id': recommendationSessionId,
        ...(token ? { token } : {}),
    }), [recommendationSessionId, token]);
    const trackInteraction = useCallback((interaction) => {
        const key = interaction.type + ':' + (interaction.productId || interaction.sourceProductId || interaction.query || '');
        const cooldown = interaction.type === 'view' ? 30 * 60 * 1000 : 60 * 1000;
        const lastTrackedAt = recentInteractionKeys.current.get(key);
        if (lastTrackedAt && Date.now() - lastTrackedAt < cooldown) return;
        recentInteractionKeys.current.set(key, Date.now());
        axios.post(backendUrl + '/api/interactions', interaction, { headers: getInteractionHeaders() })
            .catch((error) => console.warn('Could not record recommendation interaction', error));
    }, [backendUrl, getInteractionHeaders]);
    const getRecommendations = useCallback(async (excludeProductId) => {
        const response = await axios.get(backendUrl + '/api/interactions/recommendations', {
            params: { limit: 5, ...(excludeProductId ? { excludeProductId } : {}) },
            headers: getInteractionHeaders(),
        });
        return response.data.success ? response.data.products : [];
    }, [backendUrl, getInteractionHeaders]);

    const addToCart = async(itemId, size) => {
        let cartData = structuredClone(cartItems);

        if(!size) {
            toast.error('Select Product Size') 
            return;
        }

        if(cartData[itemId]) {
            if(cartData[itemId][size]) {
                cartData[itemId][size] += 1;
            } else {
                cartData[itemId][size] = 1;
            }
        }else{
            cartData[itemId] = {};
            cartData[itemId][size] = 1;
        }
        setCartItems(cartData);
        trackInteraction({ type: 'cart', productId: itemId });

        if(token) {
            try {
                await axios.post(backendUrl + '/api/cart/add', {itemId, size}, {headers: {token}})
            } catch (error) {
                console.log(error);
                toast.error(error.message)
            }
        }
    }

    const getCartCount = () => {
        let totalCount = 0;
        for(const items in cartItems){
            for(const item in cartItems[items] ) {
                try {
                    if(cartItems[items][item]) {
                        totalCount += cartItems[items][item];
                    }
                } catch (error) {
                    console.error("Error in getting cart count:", error);
                }
            }
        }
        return totalCount;
    }

    const updateQuantity = async(itemId, size, quantity) => {
        let cartData = structuredClone(cartItems);
        cartData[itemId][size] = quantity;
        setCartItems(cartData);

        if(token) {
            try {
                await axios.post(backendUrl + '/api/cart/update', {itemId, size, quantity}, {headers: {token}})
            } catch (error) {
                console.log(error);
                toast.error(error.message)
            }
        }
    }

    const getCartAmount = () => {
        let totalAmount = 0;
        for(const items in cartItems) {
            let itemInfo = products.find((product) => product._id === items);
            for(const item in cartItems[items]) {
                try {

                    if(cartItems[items][item] > 0) {
                        totalAmount += itemInfo.price * cartItems[items][item];
                    }

                } catch (error) {
                    console.error("Error in calculating cart amount:", error);
                }
            }
        }
        return totalAmount;
    }

    const getUserCart = async (token) => {
        try {
            const response = await axios.post(backendUrl + '/api/cart/get', {}, {headers: {token}} )
            if(response.data.success) {
                setCartItems(response.data.cartData)
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    }

    const getProductsData = async () => {
        try {
            const response  = await axios.get(backendUrl + '/api/product/list')
            
            if(response.data.success) {
                setProducts(response.data.products)
            } else {
                toast.error(response.data.message)
            }
            
        } catch (error) {
            console.log(error);
            toast.error(error.message)
        }
    } 

    useEffect(() => {
        getProductsData()
    }, [])

    useEffect(() => {
        if(!token && localStorage.getItem('token')) {
            setToken(localStorage.getItem('token'))
            getUserCart(localStorage.getItem('token'))
        }
    }, [])

    const value = {
        products, currency, deliver_fee,
        search, setSearch, showSearch, setShowSearch,
        cartItems, addToCart, getCartCount, updateQuantity,
        getCartAmount, navigate, 
        backendUrl, setToken, token, setCartItems,
        trackInteraction, getRecommendations
    } 

    

    return (
        <ShopContext.Provider value={value}>
            {props.children}
        </ShopContext.Provider>
    )
}

export default ShopContextProvider;