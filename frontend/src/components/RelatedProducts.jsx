import React, { useContext, useEffect, useState } from 'react'
import { ShopContext } from '../context/ShopContext'
import Title from './Title';
import ProductItem from './ProductItem';

const RelatedProducts = ({productId}) => {
    const {getRecommendations, trackInteraction} = useContext(ShopContext);
    const [related, setRelated] = useState([]);

    useEffect(() => {
        let isCurrent = true;
        const loadRecommendations = async () => {
            try {
                const recommendations = await getRecommendations(productId);
                if (isCurrent) {
                    setRelated(recommendations);
                    if (recommendations.length) trackInteraction({ type: 'recommendation_impression', sourceProductId: productId, recommendedProductIds: recommendations.map((item) => item._id) });
                }
            } catch (error) {
                console.warn('Could not load recommendations', error);
                if (isCurrent) setRelated([]);
            }
        };
        loadRecommendations();
        return () => { isCurrent = false; };
    }, [getRecommendations, productId, trackInteraction])

  return (
    <div className='my-24'>
        <div className='text-center text-3xl py-2'>
            <Title text1={'YOU MAY'} text2={'ALSO LIKE'} />
        </div>
        <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 gap-y-6'>
            {related.map((item, index) => <ProductItem key={index} id={item._id} image={item.image} name={item.name} price={item.price} onClick={() => trackInteraction({ type: 'recommendation_click', productId: item._id, sourceProductId: productId })} />)}
        </div>
    </div>
  )
}

export default RelatedProducts
