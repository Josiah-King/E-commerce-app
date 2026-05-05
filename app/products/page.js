'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import OwnerNav from '../components/OwnerNav'
import Image from 'next/image'

const EMPTY_FORM = {
  name: '',
  description: '',
  price: '',
  image: '',
  available: true,
}

export default function ProductsPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const fileInputRef = useRef(null)

  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modal state
  const [showModal, setShowModal] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)

  // Image upload state
  const [imagePreview, setImagePreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  // Redirect if not owner
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
      return
    }
    if (status === 'authenticated' && session?.user?.role !== 'OWNER') {
      router.push('/menu')
    }
  }, [status, session, router])

  // Fetch all products
  async function fetchProducts() {
    try {
      const response = await fetch('/api/products')
      const data = await response.json()
      if (!response.ok) {
        setError('Failed to load products')
        return
      }
      setProducts(data.products)
    } catch (error) {
      setError('Failed to load products')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.role !== 'OWNER') return
    fetchProducts()
  }, [status, session])

  // Open modal for adding new product
  function openAddModal() {
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setImagePreview('')
    setFormError('')
    setShowModal(true)
  }

  // Open modal for editing existing product
  function openEditModal(product) {
    setEditingProduct(product)
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price.toString(),
      image: product.image || '',
      available: product.available,
    })
    setImagePreview(product.image || '')
    setFormError('')
    setShowModal(true)
  }

  // Close modal
  function closeModal() {
    setShowModal(false)
    setEditingProduct(null)
    setForm(EMPTY_FORM)
    setImagePreview('')
    setFormError('')
  }

  // Handle image file selection
  async function handleImageSelect(e) {
    const file = e.target.files[0]
    if (!file) return

    // Show preview immediately
    const reader = new FileReader()
    reader.onload = (e) => setImagePreview(e.target.result)
    reader.readAsDataURL(file)

    // Upload to Cloudinary
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError('Image upload failed. Please try again.')
        return
      }

      // Save the Cloudinary URL to the form
      setForm((prev) => ({ ...prev, image: data.url }))
    } catch (error) {
      setFormError('Image upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  // Toggle product availability
  async function toggleAvailability(product) {
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: !product.available }),
      })

      if (!response.ok) {
        alert('Failed to update availability')
        return
      }

      // Update locally
      setProducts((prev) =>
        prev.map((p) =>
          p.id === product.id
            ? { ...p, available: !p.available }
            : p
        )
      )
    } catch (error) {
      alert('Failed to update availability')
    }
  }

  // Save product (create or update)
  async function handleSave() {
    setFormError('')

    if (!form.name || !form.price) {
      setFormError('Name and price are required')
      return
    }

    if (isNaN(parseFloat(form.price)) || parseFloat(form.price) <= 0) {
      setFormError('Please enter a valid price')
      return
    }

    if (uploading) {
      setFormError('Please wait for the image to finish uploading')
      return
    }

    setSaving(true)

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : '/api/products'

      const method = editingProduct ? 'PATCH' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description,
          price: parseFloat(form.price),
          image: form.image,
          available: form.available,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setFormError(data.error || 'Failed to save product')
        return
      }

      // Refresh products list
      await fetchProducts()
      closeModal()

    } catch (error) {
      setFormError('Failed to save product. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // Delete product
  async function handleDelete(productId) {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        alert('Failed to delete product')
        return
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId))
    } catch (error) {
      alert('Failed to delete product')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-4xl mb-3">🍟</p>
          <p className="text-orange-500 text-lg font-medium">
            Loading products...
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">

      <OwnerNav />

      <main className="max-w-5xl mx-auto px-4 py-6">

        {/* ── Page Header ── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Products</h2>
            <p className="text-gray-500 text-sm mt-1">
              {products.length} products on the menu
            </p>
          </div>
          <button
            onClick={openAddModal}
            className="bg-orange-500 hover:bg-orange-600 text-white font-semibold px-5 py-2.5 rounded-xl transition flex items-center gap-2"
          >
            + Add Product
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm mb-6">
            {error}
          </div>
        )}

        {/* ── Products Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition ${
                product.available
                  ? 'border-transparent'
                  : 'border-red-200 opacity-75'
              }`}
            >
              {/* Product Image */}
              <div className="relative w-full h-48 bg-orange-50">
                {product.image ? (
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-5xl">🍟</span>
                  </div>
                )}

                {/* Availability Badge */}
                <div className="absolute top-3 right-3">
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                      product.available
                        ? 'bg-green-100 text-green-700'
                        : 'bg-red-100 text-red-600'
                    }`}
                  >
                    {product.available ? 'Available' : 'Out of Stock'}
                  </span>
                </div>
              </div>

              {/* Product Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-1">
                  <h3 className="font-bold text-gray-800">{product.name}</h3>
                  <p className="font-bold text-orange-500">
                    Ksh {product.price}
                  </p>
                </div>
                <p className="text-gray-400 text-sm mb-4">
                  {product.description || 'No description'}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2">

                  {/* Toggle Availability */}
                  <button
                    onClick={() => toggleAvailability(product)}
                    className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                      product.available
                        ? 'bg-red-50 text-red-500 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {product.available
                      ? 'Mark Out of Stock'
                      : 'Mark Available'}
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => openEditModal(product)}
                    className="px-3 py-2 rounded-xl bg-gray-100 text-gray-600 hover:bg-gray-200 text-sm font-medium transition"
                  >
                    ✏️ Edit
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDelete(product.id)}
                    className="px-3 py-2 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 text-sm font-medium transition"
                  >
                    🗑️
                  </button>

                </div>
              </div>
            </div>
          ))}
        </div>

      </main>

      {/* ── Add/Edit Product Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-800">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-5">

              {/* Image Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Product Image
                </label>

                {/* Image Preview */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="relative w-full h-48 bg-orange-50 rounded-xl border-2 border-dashed border-orange-200 flex items-center justify-center cursor-pointer hover:bg-orange-100 transition overflow-hidden"
                >
                  {imagePreview ? (
                    <Image
                      src={imagePreview}
                      alt="Preview"
                      fill
                      className="object-cover rounded-xl"
                    />
                  ) : (
                    <div className="text-center">
                      <p className="text-3xl mb-2">📸</p>
                      <p className="text-sm text-gray-500">
                        Click to upload image
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}

                  {/* Upload overlay */}
                  {uploading && (
                    <div className="absolute inset-0 bg-white bg-opacity-80 flex items-center justify-center rounded-xl">
                      <p className="text-orange-500 font-medium text-sm">
                        Uploading...
                      </p>
                    </div>
                  )}
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />

                {imagePreview && (
                  <button
                    onClick={() => {
                      setImagePreview('')
                      setForm((prev) => ({ ...prev, image: '' }))
                    }}
                    className="mt-2 text-xs text-red-500 hover:text-red-600"
                  >
                    Remove image
                  </button>
                )}
              </div>

              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Product Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Chapati"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  placeholder="e.g. Soft freshly made chapati"
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                />
              </div>

              {/* Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price (Ksh)
                </label>
                <input
                  type="number"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="e.g. 50"
                  min="0"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>

              {/* Available Toggle */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Available
                  </p>
                  <p className="text-xs text-gray-400">
                    Students can order this item
                  </p>
                </div>
                <button
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      available: !prev.available,
                    }))
                  }
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    form.available ? 'bg-orange-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                      form.available ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Form Error */}
              {formError && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {formError}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 p-5 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="flex-1 py-3 rounded-xl border border-gray-300 text-gray-600 hover:bg-gray-50 font-medium text-sm transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || uploading}
                className="flex-1 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-semibold text-sm transition disabled:opacity-50"
              >
                {saving
                  ? 'Saving...'
                  : editingProduct
                  ? 'Save Changes'
                  : 'Add Product'}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
