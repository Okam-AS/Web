<template>
  <div>
    <page-header />
    <main class="page-content blog">
      <div class="article">
        <div class="wrapper">
          <div class="element text-content">
            <h1 class="heading-1 u-center">
              {{ blogsRoot.heading }}
            </h1>
            <p class="u-center">
              {{ blogsRoot.main_intro }}
            </p>
            <div>
              <div v-for="article in blogs" :key="article.id">
                <a :href="'/aktuelt/' + article.url" class="blog_item">
                  <div class="blog_image">
                    <img
                      :src="article.main_image.formats.thumbnail.url"
                      :alt="article.main_image.alternativeText"
                    >
                  </div>
                  <div class="blog_teaser">
                    <h2>{{ article.heading }}</h2>
                    <p v-html="$md.render(article.main_intro)" />
                    <a :href="'/aktuelt/' + article.url">Les mer</a>
                  </div>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
    <page-footer />
  </div>
</template>
<script>
export default {
  data: () => ({
    strapiBaseUrl: process.env.STRAPI_BASE_URL,
    blogsRoot: {
      id: 0,
      heading: '',
      main_intro: ''
    },
    blogs: [
      {
        id: 0,
        heading: '',
        main_intro: '',
        main_body: '',
        main_image: {
          alternativeText: '',
          formats: {
            small: {
              url: ''
            },
            thumbnail: {
              url: ''
            }
          }
        },
        images: [],
        created_at: '',
        updated_at: ''
      }
    ]
  }),
  mounted () {
    fetch(`${this.strapiBaseUrl}/blog-posts`).then((res) => {
      res.json().then((jsonResponse) => {
        this.blogs = jsonResponse
      })
    })
    fetch(`${this.strapiBaseUrl}/blog-posts-root`).then((res) => {
      res.json().then((jsonResponse) => {
        this.blogsRoot = jsonResponse
      })
    })
  }
}
</script>

<style lang="scss">
.blog {
	&_item {
		margin-top: 5rem;
		display: flex;
		flex-direction: column;
		border-bottom: none;

		@media only screen and (min-width: 600px) {
			flex-direction: row;
		}
	}

	&_image {
		max-width: 100%;
		@media only screen and (min-width: 600px) {
			float: left;
			max-width: 200px;
		}

		img {
			width: 100%;
			height: auto;
		}
	}

	&_teaser {
		@media only screen and (min-width: 600px) {
			padding-left: 2rem;
		}
	}
}
</style>
