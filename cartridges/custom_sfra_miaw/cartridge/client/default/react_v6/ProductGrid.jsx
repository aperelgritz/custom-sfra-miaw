import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import './ProductGrid.css';

const ProductGrid = ({ pids }) => {
	const [products, setProducts] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	useEffect(() => {
		if (!pids || pids.length === 0) return;

		const formattedPids = pids.map((pid) => (pid.startsWith('P_KIE_') ? pid : `P_KIE_${pid}`));

		const fetchProducts = async () => {
			try {
				const response = await fetch(
					`https://zzse-022.dx.commercecloud.salesforce.com/on/demandware.store/Sites-KIE-Site/default/ProductTiles-GetJson?ids=${formattedPids.join(
						','
					)}`
				);
				if (!response.ok) {
					throw new Error('Failed to fetch products');
				}
				const data = await response.json();
				setProducts(data.products || []);
			} catch (err) {
				setError(err.message);
			} finally {
				setLoading(false);
			}
		};

		fetchProducts();
	}, [pids]);

	if (products.length === 0) return <h2 style={{ margin: '0 auto' }}>&#x1F448; Tell us what you need!</h2>;
	if (loading) return <h3 style={{ margin: '0 auto' }}>Loading products...</h3>;
	if (error) return <h3 style={{ margin: '0 auto' }}>Error: {error}</h3>;

	return (
		<>
			{products.length > 0 ? (
				<>
					<h2 style={{ margin: '0 auto' }}>
						Found <b>{products.length}</b> products
					</h2>
					<div className='product-finder-grid'>
						<AnimatePresence mode='popLayout'>
							{products.map((product) => (
								<motion.div
									key={product.id}
									layout
									initial={{ opacity: 0 }}
									animate={{ opacity: 1 }}
									exit={{ opacity: 0 }}
									transition={{ duration: 0.3 }}
									className='product-finder-grid__product-tile'
								>
									<a href={product.productUrl} target='_blank' rel='noopener noreferrer'>
										<img src={product.imageUrl} alt={product.name} className='product-finder-grid__product-image' />
										<div>{product.name}</div>
									</a>
									<p>{`$${parseFloat(product.price).toFixed(2)}`}</p>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</>
			) : (
				<p>No products found.</p>
			)}
		</>
	);
};

export default ProductGrid;
